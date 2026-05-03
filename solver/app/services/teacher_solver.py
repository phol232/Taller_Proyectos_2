"""Phase 1: TeacherScheduleSolver.

Greedy CSP: asigna (course_component, classroom, teacher, bloque_horario)
respetando que cada componente ocupa un bloque CONTINUO de `weekly_hours` horas
dentro de una ventana de disponibilidad del docente Y del aula.

Restricciones respetadas:
  H1 – Un docente no puede estar en dos sitios al mismo tiempo.
  H2 – Un aula no puede albergar dos clases al mismo tiempo.
  H3 – Disponibilidad horaria del docente (ventanas en time_slots).
  H4 – Disponibilidad horaria del aula (ventanas en time_slots).
  H5 – room_type del aula debe coincidir con required_room_type del componente.
  H6 – El docente debe estar asignado al componente (teacher_course_components).
  H7 – La duración del bloque = weekly_hours del componente.
  H8 – Para un mismo curso, THEORY debe quedar programada antes que PRACTICE/GENERAL.
  classroom_courses / classroom_course_components: solo aulas autorizadas.
"""
from __future__ import annotations

import time as _time
import random
from collections import defaultdict
from datetime import time
from uuid import UUID

from app.core.logging import get_logger
from app.domain.models import (
    Conflict,
    ConflictType,
    CourseOffer,
    DayOfWeek,
    ScheduledBlock,
    TeachingScheduleSolution,
)
from app.domain.solver_input import SolverInput
from app.services.demand_projector import CourseDemand

log = get_logger(__name__)

# Bloque ocupado: (day, start_time, end_time)
_Block = tuple[DayOfWeek, time, time]

# Hora a partir de la cual se considera turno nocturno
_NIGHT_START = time(18, 0)
# Frontera entre franja S1 (mañana) y S2 (medio-día/tarde)
_AFTERNOON_START = time(12, 0)

# Bloques maestros institucionales: sesiones de 90 min,
# con 10 min de desplazamiento entre sesiones.
_MASTER_START = time(7, 0)
_MASTER_END = time(22, 10)
_CLASS_BLOCK_MINUTES = 90
_TRAVEL_GAP_MINUTES = 10
_LUNCH_RECESS_START = time(13, 30)
_LUNCH_RECESS_END = time(14, 0)

# Restricción de fin de semana.
# True  = bloqueo total (hard constraint): nunca se asigna sábado/domingo.
# False = sábado/domingo disponibles como fallback; el score ya los penaliza
#         mediante is_weekend = 1 en la función de coste, por lo que el
#         algoritmo los usará solo cuando no haya slots Lun-Vie disponibles.
_BLOCK_WEEKENDS: bool = False

# Pesos de penalización por franja incorrecta:
#   S1/S2: penalización baja (1 por franja de distancia)
#   S3 fuera de noche: penalización alta para forzar noche cuando sea posible
_S3_WRONG_SHIFT_PENALTY = 6   # S3 en mañana o tarde → penalización fuerte
_S1S2_WRONG_SHIFT_PENALTY = 1  # S1/S2 desfasadas → penalización suave


def _shift_score(slot_start: time, section_idx: int) -> int:
    """Soft constraint de turno por sección (3 franjas).

    Preferencia (score 0 = preferido, mayor = peor):
      S1 (idx 0) → mañana   (07:00–12:00)
      S2 (idx 1) → tarde    (12:00–18:00)
      S3 (idx≥2) → nocturno (18:00–22:10)

    S3 fuera de noche recibe penalización alta (_S3_WRONG_SHIFT_PENALTY * distancia).
    Si la franja preferida no tiene candidatos viables, el algoritmo
    recae en franjas alternativas. Nunca bloquea.
    """
    if slot_start >= _NIGHT_START:
        franja = 2  # noche
    elif slot_start >= _AFTERNOON_START:
        franja = 1  # tarde
    else:
        franja = 0  # mañana
    pref = 0 if section_idx == 0 else (1 if section_idx == 1 else 2)
    distancia = abs(franja - pref)
    if distancia == 0:
        return 0
    # S3 fuera de noche → penalización más fuerte
    penalty = _S3_WRONG_SHIFT_PENALTY if section_idx >= 2 else _S1S2_WRONG_SHIFT_PENALTY
    return penalty * distancia



def _add_hours(t: time, hours: float) -> time:
    total_minutes = t.hour * 60 + t.minute + round(hours * 60)
    if total_minutes > 24 * 60:
        raise ValueError("bloque fuera del dia")
    return time(total_minutes // 60, total_minutes % 60)


def _add_minutes(t: time, minutes: int) -> time:
    total_minutes = t.hour * 60 + t.minute + minutes
    if total_minutes > 24 * 60:
        raise ValueError("bloque fuera del dia")
    return time(total_minutes // 60, total_minutes % 60)


def _to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _duration_minutes(start: time, end: time) -> int:
    return _to_minutes(end) - _to_minutes(start)


def _overlaps(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return a_start < b_end and b_start < a_end


def _contains(window_start: time, window_end: time, block_start: time, block_end: time) -> bool:
    return window_start <= block_start and block_end <= window_end


def _master_block_ranges() -> list[tuple[time, time, int]]:
    """Particiona la franja maestra en bloques institucionales exactos."""
    out: list[tuple[time, time, int]] = []
    start = _MASTER_START
    while True:
        end = _add_minutes(start, _CLASS_BLOCK_MINUTES)
        if end > _MASTER_END:
            break
        out.append((start, end, _to_minutes(start)))
        next_start = _add_minutes(end, _TRAVEL_GAP_MINUTES)
        if end == _LUNCH_RECESS_START:
            next_start = _LUNCH_RECESS_END
        if next_start >= _MASTER_END:
            break
        start = next_start
    return out


def _expected_next_block_start(block_end: time) -> time:
    if block_end == _LUNCH_RECESS_START:
        return _LUNCH_RECESS_END
    return _add_minutes(block_end, _TRAVEL_GAP_MINUTES)


def _compact_block_groups(
    eligible_blocks: list[ScheduledBlock],
    required_blocks: int,
) -> list[tuple[ScheduledBlock, ...]]:
    """Forma sesiones indivisibles: mismo día y bloques maestros consecutivos."""
    if required_blocks <= 0:
        return []
    by_day: dict[DayOfWeek, list[ScheduledBlock]] = defaultdict(list)
    for block in eligible_blocks:
        by_day[block.day].append(block)

    out: list[tuple[ScheduledBlock, ...]] = []
    for day_blocks in by_day.values():
        day_blocks.sort(key=lambda block: block.start_time)
        if len(day_blocks) < required_blocks:
            continue
        for idx in range(0, len(day_blocks) - required_blocks + 1):
            group = tuple(day_blocks[idx:idx + required_blocks])
            if all(
                nxt.start_time == _expected_next_block_start(prev.end_time)
                for prev, nxt in zip(group, group[1:])
            ):
                out.append(group)
    return out


# Orden de días de la semana (para H8 y para penalizar fin de semana)
_DAY_ORDER: dict[DayOfWeek, int] = {
    DayOfWeek.MONDAY: 0,
    DayOfWeek.TUESDAY: 1,
    DayOfWeek.WEDNESDAY: 2,
    DayOfWeek.THURSDAY: 3,
    DayOfWeek.FRIDAY: 4,
    DayOfWeek.SATURDAY: 5,
    DayOfWeek.SUNDAY: 6,
}

# Días considerados fin de semana (penalización suave)
_WEEKEND_DAYS = {DayOfWeek.SATURDAY, DayOfWeek.SUNDAY}

# Descanso mínimo HARD entre bloques del mismo docente en el mismo día (minutos).
# Gap = 0 (bloques consecutivos sin pausa) queda prohibido como hard constraint.
# Un bloque de un curso entre medio (~2h) satisface este umbral.
_TEACHER_REST_HARD_MIN = 1   # cualquier hueco > 0 ya cumple el hard

# Descanso mínimo DESEADO (soft): si el gap es menor a esto pero > 0, se penaliza.
# 90 min ≈ un bloque de 1.5h de otro curso entre medio.
_TEACHER_REST_MIN = 90

# Gap máximo tolerable entre bloques del mismo docente el mismo día (en minutos).
# Bloques con hueco > _MAX_GAP_MIN reciben penalización soft proporcional al exceso.
_MAX_GAP_MIN = 10

# Restricción dura: prohibir bloques que crucen la franja de almuerzo.
# Los bloques que empiecen antes de _LUNCH_END y terminen después de _LUNCH_START
# son descartados como candidatos.
_BLOCK_LUNCH = True
_LUNCH_START = time(13, 30)
_LUNCH_END   = time(14,  0)


def _minutes_between(end_a: time, start_b: time) -> int:
    """Minutos entre el fin de un bloque y el inicio del siguiente (ambos en el mismo día)."""
    return (start_b.hour * 60 + start_b.minute) - (end_a.hour * 60 + end_a.minute)


class TimeBudgetExceeded(Exception):
    pass


class TeacherScheduleSolver:
    def __init__(
        self,
        data: SolverInput,
        demand: dict[UUID, CourseDemand],
        seed: int | None = None,
    ):
        self._data = data
        self._demand = demand
        self._rng = random.Random(seed)

        # Bloques ocupados por entidad
        self._teacher_blocks: dict[UUID, list[_Block]] = defaultdict(list)
        self._classroom_blocks: dict[UUID, list[_Block]] = defaultdict(list)

        # Evitar reusar misma aula para dos ofertas del mismo componente
        self._course_used_classrooms: dict[UUID, set[UUID]] = defaultdict(set)

        # Variedad de sala: conteo de bloques por (classroom_id, day, course_id).
        # Penaliza (soft) asignar el mismo curso a la misma sala el mismo día varias veces.
        self._classroom_day_course_count: dict[
            tuple[UUID, DayOfWeek], dict[UUID, int]
        ] = defaultdict(lambda: defaultdict(int))

        # Dispersión diaria: cuántas secciones del mismo curso ya caen en un día dado.
        # Se usa como soft constraint para distribuir secciones entre distintos días.
        self._course_day_sections: dict[tuple[UUID, DayOfWeek], int] = defaultdict(int)

        # H8: registra TODOS los fines de THEORY ya asignados por curso → (day_idx, end_time)
        # PRACTICE/GENERAL deben ir después del MAX de estos.
        self._course_theory_ends: dict[UUID, list[tuple[int, time]]] = defaultdict(list)

        # Consistencia docente: docente que ya tiene asignada la THEORY de
        # (course_id, section_idx). Cuando se busca PRACTICE/GENERAL para esa
        # misma sección, se prefiere reutilizar este docente.
        self._section_teacher: dict[tuple[UUID, int], UUID] = {}

        # Variedad docente: docentes ya usados por curso (cualquier sección/componente).
        # Penaliza (soft) asignar el mismo docente a varias secciones distintas del mismo curso.
        self._course_used_teachers: dict[UUID, set[UUID]] = defaultdict(set)

        # Cache: classroom_id → set de course_id autorizados (inverso de classroom_courses)
        self._classroom_courses_cache: dict[UUID, set[UUID]] | None = None
        self._master_blocks_cache: dict[DayOfWeek, list[ScheduledBlock]] | None = None

        self._deadline_ts: float | None = None

    def _classroom_to_courses(self) -> dict[UUID, set[UUID]]:
        if self._classroom_courses_cache is None:
            cache: dict[UUID, set[UUID]] = defaultdict(set)
            for course_id, classroom_ids in self._data.classroom_courses.items():
                for classroom_id in classroom_ids:
                    cache[classroom_id].add(course_id)
            self._classroom_courses_cache = dict(cache)
        return self._classroom_courses_cache

    def _master_blocks_by_day(self) -> dict[DayOfWeek, list[ScheduledBlock]]:
        if self._master_blocks_cache is not None:
            return self._master_blocks_cache

        expected = {
            (start, end): order
            for start, end, order in _master_block_ranges()
        }
        blocks: dict[DayOfWeek, list[ScheduledBlock]] = defaultdict(list)
        for slot in self._data.time_slots.values():
            order = expected.get((slot.start_time, slot.end_time))
            if order is None:
                continue
            blocks[slot.day_of_week].append(
                ScheduledBlock(
                    time_slot_id=slot.id,
                    day=slot.day_of_week,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    slot_order=order,
                )
            )
        for day_blocks in blocks.values():
            day_blocks.sort(key=lambda block: block.slot_order)

        self._master_blocks_cache = dict(blocks)
        return self._master_blocks_cache

    def _available_windows(self, slot_ids: set[UUID] | None) -> list:
        source_ids = slot_ids if slot_ids else set(self._data.time_slots.keys())
        return [
            self._data.time_slots[sid]
            for sid in source_ids
            if sid in self._data.time_slots
        ]

    def _blocks_inside_availability(
        self,
        *,
        teacher_id: UUID,
        classroom_id: UUID,
        min_day_idx: int | None = None,
        min_start: time | None = None,
    ) -> list[ScheduledBlock]:
        t_windows = self._available_windows(self._data.teacher_availability.get(teacher_id, set()))
        c_windows = self._available_windows(self._data.classroom_availability.get(classroom_id, set()))
        out: list[ScheduledBlock] = []

        for day, day_blocks in self._master_blocks_by_day().items():
            day_idx = _DAY_ORDER.get(day, 9)
            if min_day_idx is not None and day_idx < min_day_idx:
                continue

            teacher_windows = [window for window in t_windows if window.day_of_week == day]
            classroom_windows = [window for window in c_windows if window.day_of_week == day]
            if not teacher_windows or not classroom_windows:
                continue

            for block in day_blocks:
                if (
                    min_day_idx is not None
                    and day_idx == min_day_idx
                    and min_start is not None
                    and block.start_time < min_start
                ):
                    continue
                if not any(
                    _contains(window.start_time, window.end_time, block.start_time, block.end_time)
                    for window in teacher_windows
                ):
                    continue
                if not any(
                    _contains(window.start_time, window.end_time, block.start_time, block.end_time)
                    for window in classroom_windows
                ):
                    continue
                out.append(block)

        return out

    # ------------------------------------------------------------------
    def solve(self, *, time_limit_ms: int) -> tuple[TeachingScheduleSolution, list[Conflict]]:
        self._deadline_ts = _time.monotonic() + time_limit_ms / 1000.0
        conflicts: list[Conflict] = []

        # Agrupa variables por curso (todas las repeticiones de todos los componentes del curso)
        # Atomicidad: o se asignan TODOS los componentes del curso o ninguno (rollback)
        course_to_vars: dict[UUID, list[tuple[UUID, int]]] = defaultdict(list)
        for component_id, dem in self._demand.items():
            component = self._data.course_components[component_id]
            for i in range(dem.n_classrooms):
                course_to_vars[component.course_id].append((component_id, i))

        # Dentro de cada curso, THEORY primero (H8); MRV entre cursos
        def comp_order(v: tuple[UUID, int]) -> tuple:
            cid, _ = v
            comp = self._data.course_components[cid]
            type_order = 0 if comp.component_type.upper() == "THEORY" else 1
            return (type_order, -comp.weekly_hours)

        for vars_in_course in course_to_vars.values():
            vars_in_course.sort(key=comp_order)

        # MRV entre cursos: cursos más restringidos primero
        def course_key(course_id: UUID) -> tuple:
            n_classrooms = len(self._data.classroom_courses.get(course_id, set()))
            comps = [
                self._data.course_components[cid]
                for cid, _ in course_to_vars[course_id]
            ]
            # Docente más restringido del curso (menos opciones de docente = más crítico)
            n_teachers_min = min(
                (len(self._data.teacher_course_components.get(c.id, set())) for c in comps),
                default=0,
            )
            # Minutos disponibles del docente individual más restringido del curso
            all_slot_ids_mrv = set(self._data.time_slots.keys())
            def _tid_minutes(tid: UUID) -> int:
                avail = self._data.teacher_availability.get(tid, set())
                slots = avail if avail else all_slot_ids_mrv
                return sum(
                    (self._data.time_slots[sid].end_time.hour * 60 + self._data.time_slots[sid].end_time.minute
                     - self._data.time_slots[sid].start_time.hour * 60 - self._data.time_slots[sid].start_time.minute)
                    for sid in slots if sid in self._data.time_slots
                )
            min_teacher_minutes = min(
                (
                    _tid_minutes(tid)
                    for c in comps
                    for tid in self._data.teacher_course_components.get(c.id, set())
                ),
                default=0,
            )
            return (n_classrooms, n_teachers_min, min_teacher_minutes)

        ordered_courses = sorted(
            course_to_vars.keys(),
            key=lambda cid: (*course_key(cid), self._rng.random()),
        )

        solution = TeachingScheduleSolution()
        unassigned = 0

        for course_id in ordered_courses:
            try:
                self._check_deadline()
            except TimeBudgetExceeded:
                conflicts.append(Conflict(
                    ConflictType.TIME_LIMIT_EXCEEDED,
                    "solver Phase 1 time budget exceeded",
                ))
                break

            vars_in_course = course_to_vars[course_id]
            placed_offers: list[CourseOffer] = []
            success = True

            for component_id, section_idx in vars_in_course:
                offer = next(self._candidates(component_id, section_idx), None)
                if offer is None:
                    success = False
                    break
                # Asignar número de sección (1-based) antes de persistir
                offer.section_number = section_idx + 1
                # Aplica la asignación tentativamente
                self._apply_offer(offer, placed_offers, section_idx)

            if success:
                solution.offers.extend(placed_offers)
            else:
                # Rollback: deshacer todas las asignaciones del curso
                for offer in placed_offers:
                    self._revert_offer(offer)
                unassigned += len(vars_in_course)

        assigned_count = len(solution.offers)
        total = sum(len(v) for v in course_to_vars.values())
        log.info(
            "[Phase 1] %d/%d variables asignadas | sin_asignar=%d | time_limit_hit=False",
            assigned_count, total, unassigned,
        )

        if unassigned > 0:
            conflicts.extend(self._diagnose_failures())

        return solution, conflicts

    # ------------------------------------------------------------------
    def _apply_offer(self, offer: CourseOffer, placed: list[CourseOffer], section_idx: int) -> None:
        for scheduled in offer.blocks:
            block: _Block = (scheduled.day, scheduled.start_time, scheduled.end_time)
            self._teacher_blocks[offer.teacher_id].append(block)
            self._classroom_blocks[offer.classroom_id].append(block)
        self._course_used_classrooms[offer.course_component_id].add(offer.classroom_id)
        # Variedad: registrar el curso en este (sala, día)
        for scheduled in offer.blocks:
            self._classroom_day_course_count[(offer.classroom_id, scheduled.day)][offer.course_id] += 1
        # Dispersión: registrar cuántas secciones de este curso caen este día
        for day in {scheduled.day for scheduled in offer.blocks}:
            self._course_day_sections[(offer.course_id, day)] += 1
        # Variedad docente: registrar este docente como usado en el curso
        self._course_used_teachers[offer.course_id].add(offer.teacher_id)
        # H8: registrar fin de THEORY del curso (afecta a PRACTICE/GENERAL siguientes)
        placed_comp = self._data.course_components[offer.course_component_id]
        if placed_comp.component_type.upper() == "THEORY":
            last_block = max(
                offer.blocks,
                key=lambda scheduled: (_DAY_ORDER.get(scheduled.day, 9), scheduled.end_time),
            )
            self._course_theory_ends[offer.course_id].append(
                (_DAY_ORDER.get(last_block.day, 9), last_block.end_time)
            )
            # Consistencia docente: anclar el docente a esta (curso, sección)
            self._section_teacher[(offer.course_id, section_idx)] = offer.teacher_id
        placed.append(offer)

    def _revert_offer(self, offer: CourseOffer) -> None:
        for scheduled in offer.blocks:
            block: _Block = (scheduled.day, scheduled.start_time, scheduled.end_time)
            try:
                self._teacher_blocks[offer.teacher_id].remove(block)
            except ValueError:
                pass
            try:
                self._classroom_blocks[offer.classroom_id].remove(block)
            except ValueError:
                pass
        self._course_used_classrooms[offer.course_component_id].discard(offer.classroom_id)
        # Variedad: decrementar el contador para este (sala, día, curso)
        for scheduled in offer.blocks:
            key = (offer.classroom_id, scheduled.day)
            count_map = self._classroom_day_course_count.get(key)
            if count_map is not None and offer.course_id in count_map:
                count_map[offer.course_id] -= 1
                if count_map[offer.course_id] <= 0:
                    del count_map[offer.course_id]
        # Dispersión: decrementar secciones del curso en este día
        for day in {scheduled.day for scheduled in offer.blocks}:
            dkey = (offer.course_id, day)
            self._course_day_sections[dkey] = max(0, self._course_day_sections.get(dkey, 0) - 1)
        # Variedad docente: el rollback es atómico por curso completo,
        # así que al revertir todos sus bloques limpiamos el set entero.
        self._course_used_teachers.pop(offer.course_id, None)
        placed_comp = self._data.course_components[offer.course_component_id]
        if placed_comp.component_type.upper() == "THEORY":
            last_block = max(
                offer.blocks,
                key=lambda scheduled: (_DAY_ORDER.get(scheduled.day, 9), scheduled.end_time),
            )
            entry = (_DAY_ORDER.get(last_block.day, 9), last_block.end_time)
            ends = self._course_theory_ends.get(offer.course_id)
            if ends and entry in ends:
                ends.remove(entry)
                if not ends:
                    self._course_theory_ends.pop(offer.course_id, None)
            # Liberar el ancla docente para esa sección
            self._section_teacher.pop((offer.course_id, offer.section_number - 1), None)

    # ------------------------------------------------------------------
    def _candidates(self, component_id: UUID, section_idx: int = 0):
        component = self._data.course_components[component_id]
        total_minutes = round(float(component.weekly_hours) * 60)
        if total_minutes % _CLASS_BLOCK_MINUTES != 0:
            return
        required_blocks = total_minutes // _CLASS_BLOCK_MINUTES
        if required_blocks <= 0:
            return

        teacher_ids = sorted(
            self._data.teacher_course_components.get(component_id, set()),
            key=lambda tid: str(tid),
        )

        # Aulas elegibles (course-level + component-level + room_type)
        course_classrooms = self._data.classroom_courses.get(component.course_id, set())
        component_classrooms = self._data.classroom_course_components.get(component_id)
        if component_classrooms:
            eligible = course_classrooms & component_classrooms
        elif course_classrooms:
            eligible = course_classrooms
        else:
            # Fallback: el curso no tiene aulas asignadas explícitamente.
            # Solo es elegible un aula si:
            #   - el aula tampoco tiene cursos asignados (aula libre), o
            #   - el curso ya estaba en la lista de cursos del aula
            # Esto evita meter cursos en aulas que ya tienen su catálogo restringido.
            eligible = set()
            for cid, classroom in self._data.classrooms.items():
                allowed_courses = self._classroom_to_courses().get(cid, set())
                if not allowed_courses or component.course_id in allowed_courses:
                    eligible.add(cid)

        classroom_ids = sorted([
            cid for cid in eligible
            if cid in self._data.classrooms
            and self._data.classrooms[cid].room_type == component.required_room_type
        ], key=lambda cid: str(cid))

        is_theory = component.component_type.upper() == "THEORY"

        candidates: list[tuple[tuple, CourseOffer]] = []

        # Priorizar docentes con menos minutos libres restantes (más restringidos primero)
        def _teacher_free_minutes(tid: UUID) -> int:
            total = sum(
                _duration_minutes(window.start_time, window.end_time)
                for window in self._available_windows(self._data.teacher_availability.get(tid, set()))
            )
            used = sum(
                (b[2].hour * 60 + b[2].minute) - (b[1].hour * 60 + b[1].minute)
                for b in self._teacher_blocks[tid]
            )
            return total - used
        teacher_ids = sorted(
            teacher_ids,
            key=lambda tid: (_teacher_free_minutes(tid), self._rng.random()),
        )

        for classroom_id in classroom_ids:
            classroom = self._data.classrooms[classroom_id]

            for teacher_id in teacher_ids:
                min_day_idx = None
                min_start = None
                if component.component_type.upper() in ("PRACTICE", "GENERAL"):
                    theory_ends = self._course_theory_ends.get(component.course_id)
                    if theory_ends:
                        min_day_idx, min_start = max(theory_ends)

                eligible_blocks = self._blocks_inside_availability(
                    teacher_id=teacher_id,
                    classroom_id=classroom_id,
                    min_day_idx=min_day_idx,
                    min_start=min_start,
                )
                if _BLOCK_WEEKENDS:
                    eligible_blocks = [
                        block for block in eligible_blocks
                        if block.day not in _WEEKEND_DAYS
                    ]

                for block_group in _compact_block_groups(eligible_blocks, required_blocks):
                    # H10 (hard): no se asigna ningún bloque que cruce almuerzo.
                    if any(
                        _BLOCK_LUNCH and block.start_time < _LUNCH_END and block.end_time > _LUNCH_START
                        for block in block_group
                    ):
                        continue

                    if any(
                        any(
                            b[0] == block.day and _overlaps(block.start_time, block.end_time, b[1], b[2])
                            for b in self._teacher_blocks[teacher_id]
                        )
                        for block in block_group
                    ):
                        continue
                    if any(
                        any(
                            b[0] == block.day and _overlaps(block.start_time, block.end_time, b[1], b[2])
                            for b in self._classroom_blocks[classroom_id]
                        )
                        for block in block_group
                    ):
                        continue

                    shift_s = sum(_shift_score(block.start_time, section_idx) for block in block_group)
                    day_idx = min(_DAY_ORDER.get(block.day, 9) for block in block_group)
                    is_weekend = 1 if any(block.day in _WEEKEND_DAYS for block in block_group) else 0
                    daily_load = sum(
                        1
                        for block in block_group
                        for b in self._classroom_blocks[classroom_id]
                        if b[0] == block.day
                    )

                    heavy_day = 1 if any(
                        sum(1 for b in self._classroom_blocks[classroom_id] if b[0] == block.day) >= 3
                        for block in block_group
                    ) else 0
                    total_load = len(self._classroom_blocks[classroom_id])
                    long_theory = 0
                    same_course_in_room_day = 1 if any(
                        component.course_id in self._classroom_day_course_count.get((classroom_id, block.day), {})
                        for block in block_group
                    ) else 0
                    course_sections_this_day = sum(
                        self._course_day_sections.get((component.course_id, block.day), 0)
                        for block in block_group
                    )
                    anchor_teacher = self._section_teacher.get(
                        (component.course_id, section_idx)
                    )
                    teacher_mismatch = 0
                    if anchor_teacher is not None and teacher_id != anchor_teacher:
                        teacher_mismatch = 1

                    _n_available_teachers = len(teacher_ids)
                    teacher_already_in_course = (
                        1 if _n_available_teachers > 1
                        and anchor_teacher is None
                        and teacher_id in self._course_used_teachers.get(component.course_id, set())
                        else 0
                    )

                    teacher_no_rest = 0
                    teacher_big_gap = 0
                    skip_candidate = False
                    for block in block_group:
                        for tb in self._teacher_blocks[teacher_id]:
                            if tb[0] != block.day:
                                continue
                            if tb[2] <= block.start_time:
                                gap = _minutes_between(tb[2], block.start_time)
                            elif block.end_time <= tb[1]:
                                gap = _minutes_between(block.end_time, tb[1])
                            else:
                                gap = 0
                            if gap < _TEACHER_REST_HARD_MIN:
                                skip_candidate = True
                                break
                            if gap < _TEACHER_REST_MIN:
                                teacher_no_rest = 1
                            if gap > _MAX_GAP_MIN:
                                teacher_big_gap = max(teacher_big_gap, gap)
                        if skip_candidate:
                            break
                    if skip_candidate:
                        continue

                    day_has_no_course_sections = 1 if course_sections_this_day == 0 else 0
                    first_block = min(
                        block_group,
                        key=lambda block: (_DAY_ORDER.get(block.day, 9), block.start_time),
                    )

                    if is_theory:
                        score = (
                            shift_s, is_weekend, heavy_day, teacher_no_rest,
                            long_theory, day_has_no_course_sections, daily_load,
                            teacher_big_gap, same_course_in_room_day, day_idx,
                            total_load, teacher_already_in_course,
                        )
                    else:
                        score = (
                            shift_s, teacher_mismatch, is_weekend, heavy_day,
                            teacher_no_rest, day_has_no_course_sections, daily_load,
                            teacher_big_gap, same_course_in_room_day, day_idx,
                            total_load, teacher_already_in_course,
                        )

                    candidates.append((
                        (*score, self._rng.random()),
                        CourseOffer(
                            course_id=component.course_id,
                            course_component_id=component_id,
                            teacher_id=teacher_id,
                            classroom_id=classroom_id,
                            day=first_block.day,
                            start_time=first_block.start_time,
                            end_time=first_block.end_time,
                            availability_slot_id=first_block.time_slot_id,
                            max_capacity=classroom.capacity,
                            blocks=list(block_group),
                        ),
                    ))

        candidates.sort(key=lambda x: x[0])
        for _, offer in candidates:
            yield offer

    # ------------------------------------------------------------------
    def _check_deadline(self) -> None:
        if self._deadline_ts is not None and _time.monotonic() > self._deadline_ts:
            raise TimeBudgetExceeded()

    def _diagnose_failures(self) -> list[Conflict]:
        conflicts: list[Conflict] = []
        for component_id, component in self._data.course_components.items():
            course = self._data.courses[component.course_id]
            teachers = self._data.teacher_course_components.get(component_id, set())
            classrooms = [
                rid for rid in self._data.classroom_courses.get(component.course_id, set())
                if rid in self._data.classrooms
                and self._data.classrooms[rid].room_type == component.required_room_type
            ]
            if not teachers or not classrooms:
                conflicts.append(Conflict(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE,
                    f"course {course.code} component {component.component_type}: "
                    "sin docentes o aulas compatibles",
                    course_id=component.course_id,
                    details={"course_component_id": str(component_id)},
                ))
        if not conflicts:
            conflicts.append(Conflict(
                ConflictType.NO_ASSIGNMENT_POSSIBLE,
                "Phase 1: algunos componentes sin asignar por disponibilidad insuficiente",
            ))
        return conflicts
