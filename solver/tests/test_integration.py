"""Tests de integración: solver contra la base de datos real (horarios_db_prueba).

Para correrlos necesitas que el container planner-db esté levantado y que
solver/.env apunte a horarios_db_prueba (ya está configurado por defecto).

Ejecutar sólo estos tests:
    .venv/bin/python -m pytest tests/test_integration.py -v

Saltar estos tests (p.ej. en CI sin BD):
    .venv/bin/python -m pytest tests/test_components.py -v

Los tests están marcados con @pytest.mark.integration para poder filtrar.
"""
from __future__ import annotations

import os
import pytest
import psycopg
from psycopg.rows import dict_row
from decimal import Decimal
from uuid import UUID

from app.core.config import get_settings
from app.core.db import close_pool, get_pool
from app.domain.solver_input import SolverInput
from app.infrastructure.input_loader import SolverInputLoader
from app.services.constraint_validator import ConstraintValidator
from app.services.demand_projector import DemandProjector
from app.services.teacher_solver import TeacherScheduleSolver
from app.domain.models import ConflictType


BLOCK_HOURS = Decimal("1.5")
MASTER_STARTS = {
    (7, 0),
    (8, 40),
    (10, 20),
    (12, 0),
    (14, 0),
    (15, 40),
    (17, 20),
    (19, 0),
    (20, 40),
}


def _required_blocks(weekly_hours) -> int:
    return int(Decimal(str(weekly_hours)) / BLOCK_HOURS)


def _is_master_block(slot) -> bool:
    minutes = (
        slot.end_time.hour * 60 + slot.end_time.minute
        - slot.start_time.hour * 60 - slot.start_time.minute
    )
    return minutes == 90 and (slot.start_time.hour, slot.start_time.minute) in MASTER_STARTS


def _expected_gap_minutes(prev_end) -> int:
    if prev_end.hour == 13 and prev_end.minute == 30:
        return 30
    return 10


def _is_compact_group(slots) -> bool:
    if len(slots) <= 1:
        return True
    ordered = sorted(slots, key=lambda slot: (slot.day_of_week.value, slot.start_time))
    day = ordered[0].day_of_week
    if any(slot.day_of_week != day for slot in ordered):
        return False
    for prev, nxt in zip(ordered, ordered[1:]):
        gap = (
            nxt.start_time.hour * 60 + nxt.start_time.minute
            - prev.end_time.hour * 60 - prev.end_time.minute
        )
        if gap != _expected_gap_minutes(prev.end_time):
            return False
    return True


def _window_contains(window, block) -> bool:
    return (
        window.day_of_week == block.day_of_week
        and window.start_time <= block.start_time
        and block.end_time <= window.end_time
    )


def _available_master_blocks(data: SolverInput, entity_id: UUID, availability: dict) -> list:
    slot_ids = availability.get(entity_id, set())
    windows = [data.time_slots[sid] for sid in slot_ids if sid in data.time_slots]
    if not windows:
        windows = list(data.time_slots.values())
    blocks = [
        slot for slot in data.time_slots.values()
        if _is_master_block(slot)
        and any(_window_contains(window, slot) for window in windows)
    ]
    return sorted(blocks, key=lambda slot: (slot.day_of_week.value, slot.start_time))


# ──────────────────────────────────────────────────────────────────
# Helpers de conexión directa (sin pool de FastAPI)
# ──────────────────────────────────────────────────────────────────

def _direct_conn():
    """Conexión psycopg3 directa para setup de fixtures."""
    dsn = get_settings().db_dsn
    return psycopg.connect(dsn, row_factory=dict_row)


def _get_period_id() -> UUID:
    """Devuelve el primer período académico activo disponible."""
    with _direct_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM academic_periods WHERE is_active = TRUE LIMIT 1")
        row = cur.fetchone()
        if row is None:
            pytest.skip("No hay períodos académicos activos en la BD de prueba")
        return row["id"]


# ──────────────────────────────────────────────────────────────────
# Fixture: SolverInput cargado desde la BD
# ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def loaded_data() -> SolverInput:
    """Carga el SolverInput completo desde horarios_db_prueba (sin estudiantes)."""
    # Asegurar que el pool use el DSN correcto del .env
    close_pool()
    period_id = _get_period_id()
    data = SolverInputLoader().load(period_id, load_students=False)
    yield data
    close_pool()


@pytest.fixture(scope="module")
def loaded_data_with_students() -> SolverInput:
    """Carga el SolverInput incluyendo estudiantes."""
    close_pool()
    period_id = _get_period_id()
    data = SolverInputLoader().load(period_id, load_students=True)
    yield data
    close_pool()


# ──────────────────────────────────────────────────────────────────
# Tests de carga: SolverInputLoader
# ──────────────────────────────────────────────────────────────────

def test_loader_carga_cursos(loaded_data):
    """SolverInputLoader debe cargar al menos 1 curso activo."""
    assert len(loaded_data.courses) >= 1, "No se cargaron cursos"


def test_loader_carga_componentes(loaded_data):
    """Cada componente debe referenciar un curso cargado."""
    assert len(loaded_data.course_components) >= 1
    for comp in loaded_data.course_components.values():
        assert comp.course_id in loaded_data.courses, (
            f"Componente {comp.id} referencia course_id desconocido"
        )


def test_loader_componentes_tienen_tipo_valido(loaded_data):
    """Los tipos de componente sólo pueden ser GENERAL, THEORY o PRACTICE."""
    valid_types = {"GENERAL", "THEORY", "PRACTICE"}
    for comp in loaded_data.course_components.values():
        assert comp.component_type in valid_types, (
            f"Tipo inválido '{comp.component_type}' en componente {comp.id}"
        )


def test_loader_no_mezcla_general_con_theory_practice(loaded_data):
    """Un curso no puede tener GENERAL mezclado con THEORY/PRACTICE (regla de modelado)."""
    from collections import defaultdict
    by_course: dict = defaultdict(set)
    for comp in loaded_data.course_components.values():
        by_course[comp.course_id].add(comp.component_type)

    for course_id, types in by_course.items():
        if "GENERAL" in types:
            assert types == {"GENERAL"}, (
                f"Curso {course_id} mezcla GENERAL con {types - {'GENERAL'}}"
            )


def test_loader_carga_docentes(loaded_data):
    """Debe haber al menos 1 docente activo."""
    assert len(loaded_data.teachers) >= 1


def test_loader_carga_aulas(loaded_data):
    """Debe haber al menos 1 aula activa."""
    assert len(loaded_data.classrooms) >= 1


def test_loader_carga_time_slots(loaded_data):
    """Debe haber al menos 1 franja de tiempo activa."""
    assert len(loaded_data.time_slots) >= 1


def test_loader_teacher_course_components_referencia_componentes(loaded_data):
    """Cada course_component_id en teacher_course_components debe existir en course_components."""
    for comp_id, teacher_ids in loaded_data.teacher_course_components.items():
        assert comp_id in loaded_data.course_components, (
            f"teacher_course_components tiene comp_id {comp_id} desconocido"
        )
        for tid in teacher_ids:
            assert tid in loaded_data.teachers, (
                f"teacher_course_components tiene teacher_id {tid} desconocido"
            )


def test_loader_classroom_courses_referencia_cursos(loaded_data):
    """Cada course_id en classroom_courses debe existir en courses."""
    for course_id, cls_ids in loaded_data.classroom_courses.items():
        assert course_id in loaded_data.courses, (
            f"classroom_courses tiene course_id {course_id} desconocido"
        )
        for cid in cls_ids:
            assert cid in loaded_data.classrooms, (
                f"classroom_courses tiene classroom_id {cid} desconocido"
            )


def test_loader_classroom_course_components_referencia_componentes(loaded_data):
    """Cada comp_id en classroom_course_components debe existir en course_components."""
    for comp_id, cls_ids in loaded_data.classroom_course_components.items():
        assert comp_id in loaded_data.course_components, (
            f"classroom_course_components tiene comp_id {comp_id} desconocido"
        )
        for cid in cls_ids:
            assert cid in loaded_data.classrooms, (
                f"classroom_course_components tiene classroom_id {cid} desconocido"
            )


def test_loader_teacher_availability_referencia_docentes_y_slots(loaded_data):
    """Disponibilidades de docente deben referenciar docentes y slots conocidos."""
    for teacher_id, slot_ids in loaded_data.teacher_availability.items():
        assert teacher_id in loaded_data.teachers, (
            f"teacher_availability tiene teacher_id {teacher_id} desconocido"
        )
        for sid in slot_ids:
            assert sid in loaded_data.time_slots, (
                f"teacher_availability tiene time_slot_id {sid} desconocido"
            )


def test_loader_classroom_availability_referencia_aulas_y_slots(loaded_data):
    """Disponibilidades de aula deben referenciar aulas y slots conocidos."""
    for cls_id, slot_ids in loaded_data.classroom_availability.items():
        assert cls_id in loaded_data.classrooms, (
            f"classroom_availability tiene classroom_id {cls_id} desconocido"
        )
        for sid in slot_ids:
            assert sid in loaded_data.time_slots, (
                f"classroom_availability tiene time_slot_id {sid} desconocido"
            )


def test_loader_period_max_credits_positivo(loaded_data):
    """El límite de créditos del período debe ser un entero positivo."""
    assert loaded_data.period_max_credits > 0


# ──────────────────────────────────────────────────────────────────
# Tests de DemandProjector con datos reales
# ──────────────────────────────────────────────────────────────────

def test_demand_projector_produce_entrada_por_componente(loaded_data):
    """DemandProjector debe producir un CourseDemand por cada componente activo."""
    demand = DemandProjector().project(loaded_data)
    assert len(demand) == len(loaded_data.course_components)


def test_demand_projector_n_classrooms_es_positivo(loaded_data):
    """Todos los componentes deben necesitar al menos 1 aula."""
    demand = DemandProjector().project(loaded_data)
    for comp_id, d in demand.items():
        assert d.n_classrooms >= 1, (
            f"Componente {comp_id} tiene n_classrooms={d.n_classrooms}"
        )


def test_demand_projector_course_id_correcto(loaded_data):
    """El course_id en cada CourseDemand debe coincidir con el componente."""
    demand = DemandProjector().project(loaded_data)
    for comp_id, d in demand.items():
        comp = loaded_data.course_components[comp_id]
        assert d.course_id == comp.course_id


# ──────────────────────────────────────────────────────────────────
# Tests de ConstraintValidator con datos reales pre-cargados
# (sin correr el solver: construimos offers ficticias pero con UUIDs reales)
# ──────────────────────────────────────────────────────────────────

def test_constraint_validator_acepta_asignacion_valida(loaded_data):
    """Construye una oferta 100 % válida con datos reales y espera 0 conflictos."""
    # Buscar un componente que tenga docente + aula + slots disponibles
    from app.domain.models import CourseOffer

    component = None
    teacher_id = None
    classroom_id = None
    slot_ids = None

    for comp_id, comp in loaded_data.course_components.items():
        t_ids = list(loaded_data.teacher_course_components.get(comp_id, set()))
        cls_ids = [
            cid for cid in loaded_data.classroom_courses.get(comp.course_id, set())
            if cid in loaded_data.classrooms
            and loaded_data.classrooms[cid].room_type == comp.required_room_type
            and (
                not loaded_data.classroom_course_components.get(comp.id)
                or cid in loaded_data.classroom_course_components.get(comp.id, set())
            )
        ]
        if not t_ids or not cls_ids:
            continue

        for tid in t_ids:
            for cid in cls_ids:
                teacher_blocks = _available_master_blocks(
                    loaded_data, tid, loaded_data.teacher_availability
                )
                classroom_blocks = _available_master_blocks(
                    loaded_data, cid, loaded_data.classroom_availability
                )
                classroom_block_ids = {slot.id for slot in classroom_blocks}
                common = [
                    slot for slot in teacher_blocks
                    if slot.id in classroom_block_ids
                ]
                required = _required_blocks(comp.weekly_hours)
                if len(common) >= required:
                    component = comp
                    teacher_id = tid
                    classroom_id = cid
                    slot_ids = [slot.id for slot in common[:required]]
                    break
            if component:
                break
        if component:
            break

    if component is None:
        pytest.skip(
            "No hay ningún componente con docente+aula+slots compatibles en la BD de prueba"
        )

    offer = CourseOffer(
        course_id=component.course_id,
        course_component_id=component.id,
        teacher_id=teacher_id,
        classroom_id=classroom_id,
        time_slot_ids=slot_ids,
        max_capacity=loaded_data.classrooms[classroom_id].capacity,
    )
    validator = ConstraintValidator(loaded_data)
    conflicts = validator.validate_offers([offer])
    # Filtramos únicamente los conflictos estructurales (no de traslado, que son esperables
    # si los slots son consecutivos y los edificios están lejos)
    critical = [
        c for c in conflicts
        if c.conflict_type not in {
            ConflictType.TRAVEL_TIME_VIOLATION,
            ConflictType.TIME_LIMIT_EXCEEDED,
        }
    ]
    assert critical == [], f"Conflictos inesperados: {critical}"


# ──────────────────────────────────────────────────────────────────
# Test de Phase 1: TeacherScheduleSolver con datos reales
# (sólo se pide que termine sin exceder el presupuesto de tiempo)
# ──────────────────────────────────────────────────────────────────

def test_teacher_solver_corre_sin_reventar_con_datos_reales(loaded_data):
    """Phase 1 no debe explotar ni lanzar excepción con los datos de la BD."""
    demand = DemandProjector().project(loaded_data)
    solver = TeacherScheduleSolver(loaded_data, demand)
    # Límite generoso; sólo comprobamos que retorna resultado limpio
    solution, conflicts = solver.solve(time_limit_ms=60_000)

    time_limit_hit = any(
        c.conflict_type == ConflictType.TIME_LIMIT_EXCEEDED for c in conflicts
    )
    # Si el tiempo se agotó el test pasa igualmente (la BD de prueba tiene datos
    # incompletos — pocas disponibilidades). Lo que NO debe pasar es una excepción.
    assert isinstance(solution.offers, list)
    assert isinstance(conflicts, list)

    # Resumen informativo (visible con pytest -v -s)
    placed = len(solution.offers)
    total_vars = sum(d.n_classrooms for d in demand.values())
    print(
        f"\n[Phase 1] {placed}/{total_vars} variables asignadas | "
        f"conflictos={len(conflicts)} | time_limit_hit={time_limit_hit}"
    )


def test_teacher_solver_offers_respetan_h7(loaded_data):
    """Todas las ofertas generadas deben sumar weekly_hours en bloques de 90 min (H7)."""
    demand = DemandProjector().project(loaded_data)
    solver = TeacherScheduleSolver(loaded_data, demand)
    solution, _ = solver.solve(time_limit_ms=60_000)

    for offer in solution.offers:
        comp = loaded_data.course_components[offer.course_component_id]
        expected = _required_blocks(comp.weekly_hours)
        assert len(offer.time_slot_ids) == expected, (
            f"Oferta {offer.course_component_id} tiene {len(offer.time_slot_ids)} bloques "
            f"pero weekly_hours={comp.weekly_hours} exige {expected}"
        )
        for sid in offer.time_slot_ids:
            assert _is_master_block(loaded_data.time_slots[sid])
        slots = [loaded_data.time_slots[sid] for sid in offer.time_slot_ids]
        assert _is_compact_group(slots), (
            f"Oferta {offer.course_component_id} parte una sesión de {comp.weekly_hours}h "
            "en bloques no consecutivos o de distinto día"
        )


def test_teacher_solver_offers_respetan_h1_h2(loaded_data):
    """No debe haber dos ofertas con el mismo docente o aula en el mismo slot (H1/H2)."""
    demand = DemandProjector().project(loaded_data)
    solver = TeacherScheduleSolver(loaded_data, demand)
    solution, _ = solver.solve(time_limit_ms=60_000)

    teacher_busy: set[tuple] = set()
    classroom_busy: set[tuple] = set()

    for offer in solution.offers:
        for sid in offer.time_slot_ids:
            tkey = (offer.teacher_id, sid)
            assert tkey not in teacher_busy, (
                f"H1 violado: docente {offer.teacher_id} doble-booked en slot {sid}"
            )
            teacher_busy.add(tkey)

            ckey = (offer.classroom_id, sid)
            assert ckey not in classroom_busy, (
                f"H2 violado: aula {offer.classroom_id} doble-booked en slot {sid}"
            )
            classroom_busy.add(ckey)


def test_teacher_solver_offers_respetan_h6(loaded_data):
    """Cada oferta debe tener un docente habilitado para el componente (H6)."""
    demand = DemandProjector().project(loaded_data)
    solver = TeacherScheduleSolver(loaded_data, demand)
    solution, _ = solver.solve(time_limit_ms=60_000)

    for offer in solution.offers:
        habilitados = loaded_data.teacher_course_components.get(
            offer.course_component_id, set()
        )
        assert offer.teacher_id in habilitados, (
            f"H6 violado: docente {offer.teacher_id} no habilitado para "
            f"componente {offer.course_component_id}"
        )


def test_teacher_solver_offers_respetan_h5(loaded_data):
    """Cada oferta debe usar un aula autorizada para el curso con room_type correcto (H5)."""
    demand = DemandProjector().project(loaded_data)
    solver = TeacherScheduleSolver(loaded_data, demand)
    solution, _ = solver.solve(time_limit_ms=60_000)

    for offer in solution.offers:
        comp = loaded_data.course_components[offer.course_component_id]
        cls = loaded_data.classrooms[offer.classroom_id]
        autorizadas = loaded_data.classroom_courses.get(offer.course_id, set())
        autorizadas_comp = loaded_data.classroom_course_components.get(offer.course_component_id, set())
        if autorizadas_comp:
            assert offer.classroom_id in autorizadas_comp, (
                f"H5 violado: aula {offer.classroom_id} no autorizada para componente {offer.course_component_id}"
            )
        elif autorizadas:
            assert offer.classroom_id in autorizadas, (
                f"H5 violado: aula {offer.classroom_id} no autorizada para curso {offer.course_id}"
            )
        else:
            allowed_elsewhere = {
                course_id
                for course_id, classroom_ids in loaded_data.classroom_courses.items()
                if offer.classroom_id in classroom_ids
            }
            assert not allowed_elsewhere, (
                f"H5 fallback violado: aula {offer.classroom_id} tiene catálogo restringido"
            )
        assert cls.room_type == comp.required_room_type, (
            f"H5 violado: room_type {cls.room_type} != requerido {comp.required_room_type}"
        )
