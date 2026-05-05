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
_MAX_QUALITY_ATTEMPTS = 48


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

        # Diagnóstico por curso; la precedencia real se aplica por sección.
        self._course_theory_ends: dict[UUID, list[tuple[int, time]]] = defaultdict(list)
        # H8 por sección: la práctica de una sección sigue a su propia teoría,
        # no a la última teoría global del curso.
        self._section_theory_end: dict[tuple[UUID, int], tuple[int, time]] = {}

        # Consistencia docente: docente que ya tiene asignada la THEORY de
        # (course_id, section_idx). Cuando se busca PRACTICE/GENERAL para esa
        # misma sección, se prefiere reutilizar este docente.
        self._section_teacher: dict[tuple[UUID, int], UUID] = {}

        # Variedad docente: docentes ya usados por curso (cualquier sección/componente).
        # Penaliza (soft) asignar el mismo docente a varias secciones distintas del mismo curso.
        self._course_used_teachers: dict[UUID, set[UUID]] = defaultdict(set)

        # Cache: classroom_id → set de course_id autorizados (inverso de classroom_courses)
        self._classroom_courses_cache: dict[UUID, set[UUID]] | None = None
        self._classroom_criticality_cache: dict[UUID, int] | None = None
        self._master_blocks_cache: dict[DayOfWeek, list[ScheduledBlock]] | None = None
        self._component_scoped_room_cache: dict[UUID, set[UUID]] | None = None
        self._classroom_authorized_component_cache: dict[UUID, int] | None = None
        self._metrics: dict[str, int | float | str] = {}

        self._deadline_ts: float | None = None

    def _classroom_to_courses(self) -> dict[UUID, set[UUID]]:
        if self._classroom_courses_cache is None:
            cache: dict[UUID, set[UUID]] = defaultdict(set)
            for course_id, classroom_ids in self._data.classroom_courses.items():
                for classroom_id in classroom_ids:
                    cache[classroom_id].add(course_id)
            self._classroom_courses_cache = dict(cache)
        return self._classroom_courses_cache

    def _component_scoped_rooms_by_course(self) -> dict[UUID, set[UUID]]:
        if self._component_scoped_room_cache is None:
            cache: dict[UUID, set[UUID]] = defaultdict(set)
            for component_id, classroom_ids in self._data.classroom_course_components.items():
                component = self._data.course_components.get(component_id)
                if component is None:
                    continue
                cache[component.course_id].update(classroom_ids)
            self._component_scoped_room_cache = dict(cache)
        return self._component_scoped_room_cache

    def _classroom_authorized_component_count(self) -> dict[UUID, int]:
        if self._classroom_authorized_component_cache is None:
            by_room: dict[UUID, set[UUID]] = defaultdict(set)
            for component_id, classroom_ids in self._data.classroom_course_components.items():
                if component_id not in self._data.course_components:
                    continue
                for classroom_id in classroom_ids:
                    by_room[classroom_id].add(component_id)

            components_by_course: dict[UUID, set[UUID]] = defaultdict(set)
            for component_id, component in self._data.course_components.items():
                components_by_course[component.course_id].add(component_id)

            component_scoped_rooms = self._component_scoped_rooms_by_course()
            for course_id, classroom_ids in self._data.classroom_courses.items():
                for classroom_id in classroom_ids:
                    if classroom_id in component_scoped_rooms.get(course_id, set()):
                        continue
                    by_room[classroom_id].update(components_by_course.get(course_id, set()))

            self._classroom_authorized_component_cache = {
                classroom_id: len(component_ids)
                for classroom_id, component_ids in by_room.items()
            }
        return self._classroom_authorized_component_cache

    def _classroom_relative_load_penalty(
        self,
        classroom_id: UUID,
        extra_blocks: int = 0,
    ) -> int:
        authorized_count = max(
            1,
            self._classroom_authorized_component_count().get(classroom_id, 0),
        )
        predicted_load = len(self._classroom_blocks[classroom_id]) + extra_blocks
        return (predicted_load * 100) // authorized_count

    def _eligible_classrooms_for_component(self, component_id: UUID) -> set[UUID]:
        component = self._data.course_components[component_id]
        course_classrooms = set(self._data.classroom_courses.get(component.course_id, set()))
        component_classrooms = self._data.classroom_course_components.get(component_id)
        component_scoped_rooms = self._component_scoped_rooms_by_course().get(component.course_id, set())

        def fallback_classrooms() -> set[UUID]:
            # Sin catálogo explícito: solo aulas libres o que ya incluyan el curso.
            # Si el aula ya tiene componentes explícitos del curso, no se usa
            # como fallback para componentes no marcados en esa aula.
            fallback = set()
            for cid in self._data.classrooms:
                if cid in component_scoped_rooms:
                    continue
                allowed_courses = self._classroom_to_courses().get(cid, set())
                if not allowed_courses or component.course_id in allowed_courses:
                    fallback.add(cid)
            return fallback

        if component_classrooms:
            eligible = set(component_classrooms)
        elif course_classrooms:
            eligible = course_classrooms - component_scoped_rooms
            if not eligible:
                eligible = fallback_classrooms()
        else:
            eligible = fallback_classrooms()

        return {
            cid for cid in eligible
            if cid in self._data.classrooms
            and self._data.classrooms[cid].room_type == component.required_room_type
        }

    def _classroom_criticality(self) -> dict[UUID, int]:
        if self._classroom_criticality_cache is None:
            criticality: dict[UUID, int] = defaultdict(int)
            for component_id in self._data.course_components:
                eligible = self._eligible_classrooms_for_component(component_id)
                if len(eligible) == 1:
                    criticality[next(iter(eligible))] += 1
            self._classroom_criticality_cache = dict(criticality)
        return self._classroom_criticality_cache

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
        start_ts = _time.monotonic()
        self._deadline_ts = start_ts + time_limit_ms / 1000.0

        best_solution: TeachingScheduleSolution | None = None
        best_conflicts: list[Conflict] = []
        best_score: tuple | None = None
        attempts = 0
        hit_deadline = False
        aggregate_metrics = {
            "candidate_groups_considered": 0,
            "candidates_evaluated": 0,
            "candidates_discarded": 0,
            "backtracks": 0,
        }

        while attempts < _MAX_QUALITY_ATTEMPTS:
            if attempts > 0 and _time.monotonic() >= self._deadline_ts:
                hit_deadline = True
                break

            self._reset_search_state()
            attempts += 1
            try:
                solution, conflicts, unassigned, _total = self._solve_once()
            except TimeBudgetExceeded:
                hit_deadline = True
                break

            for key in aggregate_metrics:
                aggregate_metrics[key] += int(self._metrics.get(key, 0))

            score = self._solution_quality_score(solution, unassigned)
            if best_score is None or score < best_score:
                best_solution = solution
                best_conflicts = conflicts
                best_score = score

            if _time.monotonic() >= self._deadline_ts:
                hit_deadline = True
                break

        if best_solution is None:
            elapsed_ms = round((_time.monotonic() - start_ts) * 1000)
            failed = TeachingScheduleSolution(metrics={
                "attempts": attempts,
                "duration_ms": elapsed_ms,
                "termination_reason": "TIME_LIMIT_REACHED",
                "score": 0,
                **aggregate_metrics,
            })
            return failed, [Conflict(
                ConflictType.TIME_LIMIT_EXCEEDED,
                "solver Phase 1 time budget exceeded",
            )]

        elapsed_ms = round((_time.monotonic() - start_ts) * 1000)
        best_solution.metrics = {
            "attempts": attempts,
            "duration_ms": elapsed_ms,
            "termination_reason": "TIME_LIMIT_REACHED" if hit_deadline else "LOCAL_SEARCH_COMPLETE",
            "score": int(best_score[0]) if best_score else 0,
            "room_gap_count": int(best_score[1]) if best_score else 0,
            "room_gap_minutes": int(best_score[2]) if best_score else 0,
            "used_days": int(best_score[3]) if best_score else 0,
            "unassigned_variables": int(best_score[4]) if best_score else 0,
            "weekend_blocks": int(best_score[6]) if best_score else 0,
            **aggregate_metrics,
        }

        log.info(
            "[Phase 1] %d attempts | %d offers | score=%s | reason=%s | duration=%dms",
            attempts,
            len(best_solution.offers),
            best_solution.metrics["score"],
            best_solution.metrics["termination_reason"],
            elapsed_ms,
        )

        return best_solution, best_conflicts

    def _reset_search_state(self) -> None:
        self._teacher_blocks = defaultdict(list)
        self._classroom_blocks = defaultdict(list)
        self._course_used_classrooms = defaultdict(set)
        self._classroom_day_course_count = defaultdict(lambda: defaultdict(int))
        self._course_day_sections = defaultdict(int)
        self._course_theory_ends = defaultdict(list)
        self._section_theory_end = {}
        self._section_teacher = {}
        self._course_used_teachers = defaultdict(set)
        self._metrics = {
            "candidate_groups_considered": 0,
            "candidates_evaluated": 0,
            "candidates_discarded": 0,
            "backtracks": 0,
        }

    def _solve_once(self) -> tuple[TeachingScheduleSolution, list[Conflict], int, int]:
        conflicts: list[Conflict] = []

        course_to_vars: dict[UUID, list[tuple[UUID, int]]] = defaultdict(list)
        for component_id, dem in self._demand.items():
            component = self._data.course_components[component_id]
            for i in range(dem.n_classrooms):
                course_to_vars[component.course_id].append((component_id, i))

        def comp_order(v: tuple[UUID, int]) -> tuple:
            cid, _ = v
            comp = self._data.course_components[cid]
            type_order = 0 if comp.component_type.upper() == "THEORY" else 1
            eligible_count = len(self._eligible_classrooms_for_component(cid))
            teacher_count = len(self._data.teacher_course_components.get(cid, set()))
            return (eligible_count, teacher_count, type_order, -comp.weekly_hours)

        for vars_in_course in course_to_vars.values():
            vars_in_course.sort(key=comp_order)

        def teacher_minutes(component_id: UUID) -> int:
            all_slot_ids = set(self._data.time_slots.keys())

            def tid_minutes(tid: UUID) -> int:
                avail = self._data.teacher_availability.get(tid, set())
                slots = avail if avail else all_slot_ids
                return sum(
                    _duration_minutes(
                        self._data.time_slots[sid].start_time,
                        self._data.time_slots[sid].end_time,
                    )
                    for sid in slots if sid in self._data.time_slots
                )

            return min(
                (
                    tid_minutes(tid)
                    for tid in self._data.teacher_course_components.get(component_id, set())
                ),
                default=0,
            )

        def course_key(course_id: UUID) -> tuple:
            component_ids = [cid for cid, _ in course_to_vars[course_id]]
            classroom_counts = [
                len(self._eligible_classrooms_for_component(cid))
                for cid in component_ids
            ]
            teacher_counts = [
                len(self._data.teacher_course_components.get(cid, set()))
                for cid in component_ids
            ]
            rule = self._data.course_rules.get(course_id)
            priority = rule.priority if rule is not None else 0
            fill_remaining = (
                1 if rule is not None
                and rule.placement_strategy.upper() == "FILL_REMAINING"
                else 0
            )
            return (
                priority,
                fill_remaining,
                min(classroom_counts, default=0),
                min(teacher_counts, default=0),
                min((teacher_minutes(cid) for cid in component_ids), default=0),
                -len(component_ids),
            )

        ordered_courses = sorted(
            course_to_vars.keys(),
            key=lambda cid: (*course_key(cid), self._rng.random()),
        )

        solution = TeachingScheduleSolution()
        unassigned = 0

        for course_id in ordered_courses:
            self._check_deadline()
            vars_in_course = course_to_vars[course_id]
            placed_offers: list[CourseOffer] = []
            success = True

            for component_id, section_idx in vars_in_course:
                offer = next(self._candidates(component_id, section_idx), None)
                if offer is None:
                    success = False
                    break
                offer.section_number = section_idx + 1
                self._apply_offer(offer, placed_offers, section_idx)

            if success:
                solution.offers.extend(placed_offers)
            else:
                for offer in placed_offers:
                    self._revert_offer(offer)
                self._metrics["backtracks"] = int(self._metrics["backtracks"]) + 1
                unassigned += len(vars_in_course)

        total = sum(len(v) for v in course_to_vars.values())
        if unassigned > 0:
            conflicts.extend(self._diagnose_failures())
        return solution, conflicts, unassigned, total

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
            self._section_theory_end[(offer.course_id, section_idx)] = (
                _DAY_ORDER.get(last_block.day, 9),
                last_block.end_time,
            )
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
            self._section_theory_end.pop((offer.course_id, offer.section_number - 1), None)

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

        classroom_ids = sorted(
            self._eligible_classrooms_for_component(component_id),
            key=lambda cid: str(cid),
        )
        component_is_room_restricted = len(classroom_ids) == 1

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
                    section_theory_end = self._section_theory_end.get(
                        (component.course_id, section_idx)
                    )
                    if section_theory_end:
                        min_day_idx, min_start = section_theory_end

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
                    self._metrics["candidate_groups_considered"] = (
                        int(self._metrics["candidate_groups_considered"]) + 1
                    )
                    # H10 (hard): no se asigna ningún bloque que cruce almuerzo.
                    if any(
                        _BLOCK_LUNCH and block.start_time < _LUNCH_END and block.end_time > _LUNCH_START
                        for block in block_group
                    ):
                        self._metrics["candidates_discarded"] = (
                            int(self._metrics["candidates_discarded"]) + 1
                        )
                        continue

                    if any(
                        any(
                            b[0] == block.day and _overlaps(block.start_time, block.end_time, b[1], b[2])
                            for b in self._teacher_blocks[teacher_id]
                        )
                        for block in block_group
                    ):
                        self._metrics["candidates_discarded"] = (
                            int(self._metrics["candidates_discarded"]) + 1
                        )
                        continue
                    if any(
                        any(
                            b[0] == block.day and _overlaps(block.start_time, block.end_time, b[1], b[2])
                            for b in self._classroom_blocks[classroom_id]
                        )
                        for block in block_group
                    ):
                        self._metrics["candidates_discarded"] = (
                            int(self._metrics["candidates_discarded"]) + 1
                        )
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
                        self._metrics["candidates_discarded"] = (
                            int(self._metrics["candidates_discarded"]) + 1
                        )
                        continue

                    same_course_day_penalty = course_sections_this_day
                    gap_count, gap_minutes = self._classroom_gap_score(classroom_id, block_group)
                    relative_room_load = self._classroom_relative_load_penalty(
                        classroom_id,
                        extra_blocks=len(block_group),
                    )
                    critical_room_penalty = 0
                    if not component_is_room_restricted:
                        critical_room_penalty = self._classroom_criticality().get(classroom_id, 0)
                    first_block = min(
                        block_group,
                        key=lambda block: (_DAY_ORDER.get(block.day, 9), block.start_time),
                    )

                    if is_theory:
                        score = (
                            is_weekend, relative_room_load, critical_room_penalty,
                            daily_load, heavy_day, gap_count, gap_minutes, shift_s,
                            teacher_no_rest, long_theory, same_course_day_penalty,
                            teacher_big_gap,
                            same_course_in_room_day, day_idx, total_load,
                            teacher_already_in_course,
                        )
                    else:
                        score = (
                            is_weekend, teacher_mismatch, relative_room_load,
                            critical_room_penalty, daily_load, heavy_day, gap_count,
                            gap_minutes, shift_s, teacher_no_rest,
                            same_course_day_penalty, teacher_big_gap,
                            same_course_in_room_day, day_idx, total_load,
                            teacher_already_in_course,
                        )

                    self._metrics["candidates_evaluated"] = (
                        int(self._metrics["candidates_evaluated"]) + 1
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
    def _classroom_gap_score(
        self,
        classroom_id: UUID,
        block_group: tuple[ScheduledBlock, ...],
    ) -> tuple[int, int]:
        by_day: dict[DayOfWeek, list[tuple[time, time]]] = defaultdict(list)
        for day, start, end in self._classroom_blocks[classroom_id]:
            by_day[day].append((start, end))
        for block in block_group:
            by_day[block.day].append((block.start_time, block.end_time))

        gap_count = 0
        gap_minutes = 0
        for day_blocks in by_day.values():
            day_blocks.sort(key=lambda item: item[0])
            for (_, prev_end), (next_start, _) in zip(day_blocks, day_blocks[1:]):
                expected_gap = 30 if prev_end == _LUNCH_RECESS_START else _TRAVEL_GAP_MINUTES
                gap = _minutes_between(prev_end, next_start)
                if gap > expected_gap:
                    gap_count += 1
                    gap_minutes += gap - expected_gap
        return gap_count, gap_minutes

    def _solution_quality_score(
        self,
        solution: TeachingScheduleSolution,
        unassigned: int,
    ) -> tuple[int, int, int, int, int, int]:
        by_room_day: dict[tuple[UUID, DayOfWeek], list[ScheduledBlock]] = defaultdict(list)
        room_load: dict[UUID, int] = defaultdict(int)
        restricted_misses = 0
        for offer in solution.offers:
            component_eligible = self._eligible_classrooms_for_component(offer.course_component_id)
            if len(component_eligible) == 1 and offer.classroom_id not in component_eligible:
                restricted_misses += 1
            for block in offer.blocks:
                by_room_day[(offer.classroom_id, block.day)].append(block)
                room_load[offer.classroom_id] += 1

        gap_count = 0
        gap_minutes = 0
        weekend_blocks = 0
        used_days = len({day for _, day in by_room_day})
        daily_overload = 0
        total_room_blocks = sum(room_load.values())
        authorized_counts = {
            classroom_id: count
            for classroom_id, count in self._classroom_authorized_component_count().items()
            if classroom_id in self._data.classrooms and count > 0
        }
        total_authorized = sum(authorized_counts.values())
        authorization_underuse = 0
        if total_room_blocks > 0 and total_authorized > 0:
            for classroom_id, authorized_count in authorized_counts.items():
                expected = (total_room_blocks * authorized_count) / total_authorized
                actual = room_load.get(classroom_id, 0)
                if actual < expected:
                    authorization_underuse += round((expected - actual) * 100)
        for (_room_id, day), blocks in by_room_day.items():
            if day in _WEEKEND_DAYS:
                weekend_blocks += len(blocks)
            blocks.sort(key=lambda block: block.start_time)
            daily_overload += max(0, len(blocks) - 3)
            for prev, nxt in zip(blocks, blocks[1:]):
                expected_gap = 30 if prev.end_time == _LUNCH_RECESS_START else _TRAVEL_GAP_MINUTES
                gap = _minutes_between(prev.end_time, nxt.start_time)
                if gap > expected_gap:
                    gap_count += 1
                    gap_minutes += gap - expected_gap

        score = (
            unassigned * 100_000
            + restricted_misses * 50_000
            + weekend_blocks * 10_000
            + gap_count * 1_000
            + gap_minutes * 10
            + daily_overload * 1_000
            + authorization_underuse * 5
            + max(room_load.values(), default=0)
        )
        return (score, gap_count, gap_minutes, used_days, unassigned, restricted_misses, weekend_blocks)

    # ------------------------------------------------------------------
    def _check_deadline(self) -> None:
        if self._deadline_ts is not None and _time.monotonic() > self._deadline_ts:
            raise TimeBudgetExceeded()

    def _diagnose_failures(self) -> list[Conflict]:
        conflicts: list[Conflict] = []
        for component_id, component in self._data.course_components.items():
            course = self._data.courses[component.course_id]
            teachers = self._data.teacher_course_components.get(component_id, set())
            classrooms = self._eligible_classrooms_for_component(component_id)
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
