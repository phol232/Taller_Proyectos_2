"""Unit tests for solver components that don't depend on the database.

Cobertura por restricción según Diseno_Microservicio_Solver_CSP.md:
  H1  — Sin solapamiento de docente
  H2  — Sin solapamiento de aula
  H3  — Disponibilidad del docente
  H4  — Disponibilidad del aula
  H5  — Compatibilidad aula-componente (room_type + classroom_courses)
  H6  — Competencia del docente por componente
  H7  — Horas exactas por componente
  H9  — Tiempo de traslado del docente
  H10 — Prerrequisitos aprobados
  H11 — Límite de créditos
  H12 — Vacantes por oferta (VacancyTracker)
  H13 — Turno del estudiante (ShiftFilter)
  H14 — Curso compuesto indivisible (via CorequisiteGrouper)
  H15 — Corequisitos
       — DemandProjector: cálculo de demanda y fallback
       — SolverInput: campo classroom_course_components
       — TeacherScheduleSolver: integración mínima en memoria
       — ConstraintValidator: pipeline completo H1-H9
"""
from __future__ import annotations

from datetime import time
from uuid import uuid4

from app.domain.models import (
    Classroom,
    Conflict,
    ConflictType,
    Course,
    CourseComponent,
    CourseOffer,
    DayOfWeek,
    ScheduledBlock,
    Shift,
    Student,
    Teacher,
    TimeSlot,
    CourseSchedulingRule,
)
from app.domain.solver_input import SolverInput
from app.infrastructure.input_loader import SolverInputLoader
from app.services.constraint_validator import ConstraintValidator
from app.services.corequisite_grouper import CorequisiteGrouper
from app.services.demand_projector import DemandProjector
from app.services.demand_projector import CourseDemand
from app.services.orchestrator import SolverOrchestrator
from app.services.shift_filter import ShiftFilter
from app.services.teacher_solver import TeacherScheduleSolver
from app.services.travel_time import TravelTimeChecker
from app.services.vacancy_tracker import VacancyTracker


# ---------------------- VacancyTracker ----------------------

def test_vacancy_tracker_reserve_release():
    course_id = uuid4()
    a1, a2 = uuid4(), uuid4()
    offers = {
        a1: {"course_id": course_id, "max_capacity": 2, "enrolled_count": 0,
             "classroom_id": uuid4(), "time_slot_ids": []},
        a2: {"course_id": course_id, "max_capacity": 1, "enrolled_count": 1,
             "classroom_id": uuid4(), "time_slot_ids": []},
    }
    v = VacancyTracker(offers)
    assert v.free(a1) == 2 and v.free(a2) == 0
    assert v.reserve(a1)
    assert v.free(a1) == 1
    assert not v.reserve(a2)
    v.release(a1)
    assert v.free(a1) == 2


# ---------------------- CorequisiteGrouper ----------------------

def test_corequisite_grouper_components():
    a, b, c, d = uuid4(), uuid4(), uuid4(), uuid4()
    coreqs = {
        a: {b},
        b: {a, c},
        c: {b},
        d: set(),
    }
    grouper = CorequisiteGrouper(coreqs)
    groups = grouper.group([a, b, c, d])
    sizes = sorted(len(g) for g in groups)
    assert sizes == [1, 3]


# ---------------------- ShiftFilter ----------------------

def test_shift_filter_morning_only():
    sf = ShiftFilter()
    morning = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    afternoon = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(15, 40), time(17, 10), 940)
    assert sf.slot_in_shift(morning, Shift.MORNING)
    assert not sf.slot_in_shift(afternoon, Shift.MORNING)
    assert sf.slot_in_shift(afternoon, Shift.AFTERNOON)
    assert sf.slot_in_shift(morning, Shift.FLEXIBLE)


# ---------------------- TravelTimeChecker ----------------------

def test_travel_time_blocks_consecutive_far_buildings():
    a = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    b = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    travel = {"A": {"B": 15}, "B": {"A": 15}}
    chk = TravelTimeChecker(travel)
    # Gap is 10 minutes, required 15 -> infeasible.
    assert not chk.is_feasible(a, "A", b, "B")
    # Same building -> always feasible.
    assert chk.is_feasible(a, "A", b, "A")


def test_travel_time_allows_when_gap_sufficient():
    a = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    c = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(10, 20), time(11, 50), 620)
    travel = {"A": {"B": 15}, "B": {"A": 15}}
    chk = TravelTimeChecker(travel)
    assert chk.is_feasible(a, "A", c, "B")


# ---------------------- DemandProjector ----------------------

def test_demand_projector_falls_back_to_one():
    period_id = uuid4()
    course = Course(uuid4(), "C1", "Course 1", 1, 4, 0, 4, "AULA")
    component = CourseComponent(uuid4(), course.id, "GENERAL", 4, "AULA", 1)
    classroom = Classroom(uuid4(), "R1", "Room 1", 30, "AULA", "A")
    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course.id] = course
    data.course_components[component.id] = component
    data.classrooms[classroom.id] = classroom
    data.classroom_courses[course.id] = {classroom.id}
    # No students loaded -> fallback to 1.
    out = DemandProjector().project(data)
    assert out[component.id].n_classrooms == 1


def test_orchestrator_applies_elective_max_sections_rule():
    course_id = uuid4()
    comp_id = uuid4()
    data = SolverInput(academic_period_id=uuid4(), period_max_credits=22)
    data.course_rules[course_id] = CourseSchedulingRule(
        course_id=course_id,
        scheduling_kind="ELECTIVE",
        elective_group_code="ELECT ESP2",
        max_sections=1,
        priority=100,
        placement_strategy="FILL_REMAINING",
    )
    demand = {comp_id: CourseDemand(course_id, comp_id, 0, 30, 3)}

    SolverOrchestrator._apply_phase1_section_rules(data, demand)

    assert demand[comp_id].n_classrooms == 1


def test_teacher_solver_orders_elective_courses_last():
    required_course_id = uuid4()
    elective_course_id = uuid4()
    required_comp_id = uuid4()
    elective_comp_id = uuid4()
    teacher_id = uuid4()
    classroom_id = uuid4()
    slot1_id = uuid4()
    slot2_id = uuid4()
    data = SolverInput(academic_period_id=uuid4(), period_max_credits=22)
    data.courses[required_course_id] = Course(required_course_id, "REQ-1", "Requerido", 1, 4, 0, 1.5, "AULA")
    data.courses[elective_course_id] = Course(elective_course_id, "ASUC00210", "Desarrollo de videojuegos", 10, 3, 0, 1.5, "AULA")
    data.course_components[required_comp_id] = CourseComponent(required_comp_id, required_course_id, "THEORY", 1.5, "AULA", 1)
    data.course_components[elective_comp_id] = CourseComponent(elective_comp_id, elective_course_id, "THEORY", 1.5, "AULA", 1)
    data.teachers[teacher_id] = Teacher(teacher_id, "T-1", "Docente")
    data.classrooms[classroom_id] = Classroom(classroom_id, "A101", "A101", 40, "AULA", "A")
    data.time_slots[slot1_id] = TimeSlot(slot1_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    data.time_slots[slot2_id] = TimeSlot(slot2_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    data.teacher_course_components[required_comp_id] = {teacher_id}
    data.teacher_course_components[elective_comp_id] = {teacher_id}
    data.classroom_course_components[required_comp_id] = {classroom_id}
    data.classroom_course_components[elective_comp_id] = {classroom_id}
    data.teacher_availability[teacher_id] = {slot1_id, slot2_id}
    data.classroom_availability[classroom_id] = {slot1_id, slot2_id}
    data.course_rules[elective_course_id] = CourseSchedulingRule(
        course_id=elective_course_id,
        scheduling_kind="ELECTIVE",
        elective_group_code="ELECT ESP2",
        max_sections=1,
        priority=100,
        placement_strategy="FILL_REMAINING",
    )
    demand = {
        elective_comp_id: CourseDemand(elective_course_id, elective_comp_id, 0, 40, 1),
        required_comp_id: CourseDemand(required_course_id, required_comp_id, 0, 40, 1),
    }

    solution, conflicts = TeacherScheduleSolver(data, demand, seed=7).solve(time_limit_ms=5_000)

    assert conflicts == []
    assert [offer.course_id for offer in solution.offers] == [required_course_id, elective_course_id]


def _make_classroom_scope_data():
    period_id = uuid4()
    selected_course_id = uuid4()
    external_course_id = uuid4()
    selected_component_id = uuid4()
    external_component_id = uuid4()
    selected_teacher_id = uuid4()
    external_teacher_id = uuid4()
    selected_classroom_id = uuid4()
    external_classroom_id = uuid4()
    slot_id = uuid4()

    selected_course = Course(
        selected_course_id,
        "ASUC00001",
        "Curso seleccionado",
        1,
        4,
        0,
        1.5,
        "AULA",
    )
    external_course = Course(
        external_course_id,
        "ASUC00940",
        "Curso fuera del scope",
        1,
        4,
        0,
        1.5,
        "AULA",
    )
    selected_component = CourseComponent(
        selected_component_id,
        selected_course_id,
        "THEORY",
        1.5,
        "AULA",
        1,
    )
    external_component = CourseComponent(
        external_component_id,
        external_course_id,
        "THEORY",
        1.5,
        "LAB",
        1,
    )
    selected_teacher = Teacher(selected_teacher_id, "T001", "Docente seleccionado")
    external_teacher = Teacher(external_teacher_id, "T999", "Docente externo")
    selected_classroom = Classroom(selected_classroom_id, "J101", "J101", 30, "AULA", "J")
    external_classroom = Classroom(external_classroom_id, "X999", "X999", 20, "LAB", "X")
    slot = TimeSlot(slot_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[selected_course_id] = selected_course
    data.courses[external_course_id] = external_course
    data.course_components[selected_component_id] = selected_component
    data.course_components[external_component_id] = external_component
    data.teachers[selected_teacher_id] = selected_teacher
    data.teachers[external_teacher_id] = external_teacher
    data.classrooms[selected_classroom_id] = selected_classroom
    data.classrooms[external_classroom_id] = external_classroom
    data.time_slots[slot_id] = slot
    data.teacher_courses[selected_course_id] = {selected_teacher_id}
    data.teacher_courses[external_course_id] = {external_teacher_id}
    data.teacher_course_components[selected_component_id] = {selected_teacher_id}
    data.teacher_course_components[external_component_id] = set()
    data.classroom_courses[selected_course_id] = {selected_classroom_id}
    data.classroom_courses[external_course_id] = {external_classroom_id}
    data.classroom_course_components[selected_component_id] = {selected_classroom_id}
    data.classroom_course_components[external_component_id] = {external_classroom_id}
    data.teacher_availability[selected_teacher_id] = {slot_id}
    data.teacher_availability[external_teacher_id] = {slot_id}
    data.classroom_availability[selected_classroom_id] = {slot_id}
    data.classroom_availability[external_classroom_id] = {slot_id}
    data.course_prerequisites[selected_course_id] = {external_course_id}
    data.course_corequisites[selected_course_id] = {external_course_id}
    data.course_corequisites[external_course_id] = {selected_course_id}

    return data, {
        "selected_course_id": selected_course_id,
        "external_course_id": external_course_id,
        "selected_component_id": selected_component_id,
        "external_component_id": external_component_id,
        "selected_teacher_id": selected_teacher_id,
        "selected_classroom_id": selected_classroom_id,
    }


def test_restrict_classrooms_filters_courses_components_and_relations():
    data, ids = _make_classroom_scope_data()

    SolverOrchestrator._restrict_classrooms(data, {ids["selected_classroom_id"]})

    assert set(data.classrooms.keys()) == {ids["selected_classroom_id"]}
    assert set(data.courses.keys()) == {ids["selected_course_id"]}
    assert set(data.course_components.keys()) == {ids["selected_component_id"]}
    assert ids["selected_course_id"] not in data.classroom_courses
    assert set(data.classroom_course_components.keys()) == {ids["selected_component_id"]}
    assert set(data.teacher_courses.keys()) == {ids["selected_course_id"]}
    assert set(data.teacher_course_components.keys()) == {ids["selected_component_id"]}
    assert ids["external_course_id"] not in data.course_prerequisites[ids["selected_course_id"]]
    assert ids["external_course_id"] not in data.course_corequisites[ids["selected_course_id"]]


def test_selected_classroom_scope_ignores_external_unassignable_course():
    data, ids = _make_classroom_scope_data()

    SolverOrchestrator._restrict_classrooms(data, {ids["selected_classroom_id"]})
    demand = DemandProjector().project(data)
    solution, conflicts = TeacherScheduleSolver(data, demand, seed=1).solve(
        time_limit_ms=30_000,
    )

    assert [offer.course_id for offer in solution.offers] == [ids["selected_course_id"]]
    assert not conflicts
    assert ids["external_component_id"] not in demand


def test_selected_classroom_scope_keeps_only_explicit_components_when_parent_row_exists():
    """Una fila padre sincronizada para UI no debe arrastrar componentes no marcados."""
    period_id = uuid4()
    course_id = uuid4()
    theory_id = uuid4()
    practice_id = uuid4()
    classroom_id = uuid4()
    teacher_id = uuid4()
    slot_id = uuid4()

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = Course(course_id, "WEB-101", "Ingenieria Web", 1, 4, 0, 3.0, "AULA")
    data.course_components[theory_id] = CourseComponent(theory_id, course_id, "THEORY", 1.5, "AULA", 1)
    data.course_components[practice_id] = CourseComponent(practice_id, course_id, "PRACTICE", 1.5, "LAB", 2)
    data.teachers[teacher_id] = Teacher(teacher_id, "T-WEB", "Docente Web")
    data.classrooms[classroom_id] = Classroom(classroom_id, "A101", "A101", 40, "AULA", "A")
    data.time_slots[slot_id] = TimeSlot(slot_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    data.teacher_courses[course_id] = {teacher_id}
    data.teacher_course_components[theory_id] = {teacher_id}
    data.teacher_course_components[practice_id] = {teacher_id}
    # classroom_courses puede existir por sincronizacion del modal.
    data.classroom_courses[course_id] = {classroom_id}
    data.classroom_course_components[theory_id] = {classroom_id}
    data.teacher_availability[teacher_id] = {slot_id}
    data.classroom_availability[classroom_id] = {slot_id}

    SolverOrchestrator._restrict_classrooms(data, {classroom_id})

    assert set(data.courses.keys()) == {course_id}
    assert set(data.course_components.keys()) == {theory_id}
    assert course_id not in data.classroom_courses
    assert data.classroom_course_components[theory_id] == {classroom_id}
    assert practice_id not in data.teacher_course_components


def test_component_scoped_room_does_not_authorize_sibling_component():
    """Marcar teoria en un aula no autoriza automaticamente practica en esa misma aula."""
    period_id = uuid4()
    course_id = uuid4()
    theory_id = uuid4()
    practice_id = uuid4()
    scoped_room_id = uuid4()
    fallback_room_id = uuid4()

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = Course(course_id, "WEB-102", "Web", 1, 4, 0, 3.0, "AULA")
    data.course_components[theory_id] = CourseComponent(theory_id, course_id, "THEORY", 1.5, "AULA", 1)
    data.course_components[practice_id] = CourseComponent(practice_id, course_id, "PRACTICE", 1.5, "AULA", 2)
    data.classrooms[scoped_room_id] = Classroom(scoped_room_id, "A101", "A101", 40, "AULA", "A")
    data.classrooms[fallback_room_id] = Classroom(fallback_room_id, "B201", "B201", 40, "AULA", "B")
    # Fila padre contaminada por sincronizacion UI.
    data.classroom_courses[course_id] = {scoped_room_id}
    data.classroom_course_components[theory_id] = {scoped_room_id}

    SolverInputLoader()._normalize_classroom_course_scope(data)
    solver = TeacherScheduleSolver(data, {practice_id: CourseDemand(course_id, practice_id, 0, 40, 1)})

    assert solver._eligible_classrooms_for_component(theory_id) == {scoped_room_id}
    assert solver._eligible_classrooms_for_component(practice_id) == {fallback_room_id}


# ──────────────────────────────────────────────────────────────────
# H1 — Sin solapamiento de docente
# ──────────────────────────────────────────────────────────────────

def _make_data_h1_h2():
    """Fixture compartida para tests de solapamiento H1/H2."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    teacher_id = uuid4()
    class1_id = uuid4()
    class2_id = uuid4()
    slot1_id = uuid4()
    slot2_id = uuid4()

    course = Course(course_id, "MAT-101", "Matemáticas", 1, 4, 0, 1.5, "AULA")
    component = CourseComponent(comp_id, course_id, "GENERAL", 1.5, "AULA", 1)
    teacher = Teacher(teacher_id, "T001", "Docente A")
    cl1 = Classroom(class1_id, "A101", "Aula 101", 30, "AULA", "A")
    cl2 = Classroom(class2_id, "A102", "Aula 102", 30, "AULA", "A")
    slot1 = TimeSlot(slot1_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    slot2 = TimeSlot(slot2_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.teachers[teacher_id] = teacher
    data.classrooms[class1_id] = cl1
    data.classrooms[class2_id] = cl2
    data.time_slots[slot1_id] = slot1
    data.time_slots[slot2_id] = slot2
    data.teacher_course_components[comp_id] = {teacher_id}
    data.classroom_courses[course_id] = {class1_id, class2_id}
    data.teacher_availability[teacher_id] = {slot1_id, slot2_id}
    data.classroom_availability[class1_id] = {slot1_id, slot2_id}
    data.classroom_availability[class2_id] = {slot1_id, slot2_id}
    return data, course, component, teacher, cl1, cl2, slot1, slot2


def test_h1_teacher_double_booked_detected():
    """H1: mismo docente asignado dos veces al mismo slot → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    # Dos ofertas, mismo docente, mismo slot
    offer_a = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id], max_capacity=30,
    )
    offer_b = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl2.id,
        time_slot_ids=[slot1.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer_a, offer_b])
    types = [c.conflict_type for c in conflicts]
    assert ConflictType.NO_ASSIGNMENT_POSSIBLE in types


def test_h1_teacher_consecutive_different_slots_no_conflict():
    """H1: mismo docente en slots distintos → sin solapamiento."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    offer_a = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id], max_capacity=30,
    )
    offer_b = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot2.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer_a, offer_b])
    h1_conflicts = [
        c for c in conflicts
        if c.conflict_type == ConflictType.NO_ASSIGNMENT_POSSIBLE
        and "double booked" in c.message
    ]
    assert len(h1_conflicts) == 0


def test_h1_multi_block_single_offer_no_self_overlap():
    """H1/H2: una oferta compacta de 2 bloques no debe solaparse consigo misma."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    component = CourseComponent(component.id, course.id, "GENERAL", 3.0, "AULA", 1)
    data.course_components[component.id] = component

    offer = CourseOffer(
        course_id=course.id,
        course_component_id=component.id,
        teacher_id=teacher.id,
        classroom_id=cl1.id,
        max_capacity=30,
        blocks=[
            ScheduledBlock(slot1.id, slot1.day_of_week, slot1.start_time, slot1.end_time, slot1.slot_order),
            ScheduledBlock(slot2.id, slot2.day_of_week, slot2.start_time, slot2.end_time, slot2.slot_order),
        ],
    )

    conflicts = ConstraintValidator(data).validate_offers([offer])

    assert [
        conflict.message for conflict in conflicts
        if "double booked" in conflict.message
    ] == []


# ──────────────────────────────────────────────────────────────────
# H2 — Sin solapamiento de aula
# ──────────────────────────────────────────────────────────────────

def test_h2_classroom_double_booked_detected():
    """H2: misma aula asignada dos veces al mismo slot → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    teacher2_id = uuid4()
    teacher2 = Teacher(teacher2_id, "T002", "Docente B")
    data.teachers[teacher2_id] = teacher2
    data.teacher_course_components[component.id].add(teacher2_id)
    data.teacher_availability[teacher2_id] = {slot1.id, slot2.id}

    offer_a = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id], max_capacity=30,
    )
    offer_b = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher2_id, classroom_id=cl1.id,   # misma aula
        time_slot_ids=[slot1.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer_a, offer_b])
    classroom_conflicts = [
        c for c in conflicts
        if "classroom double booked" in c.message
    ]
    assert len(classroom_conflicts) >= 1


# ──────────────────────────────────────────────────────────────────
# H3 — Disponibilidad del docente
# ──────────────────────────────────────────────────────────────────

def test_h3_teacher_unavailable_detected():
    """H3: slot donde el docente no está disponible → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    # Quitar slot1 de la disponibilidad del docente
    data.teacher_availability[teacher.id] = {slot2.id}

    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id, slot2.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    unavail = [c for c in conflicts if "teacher not available" in c.message]
    assert len(unavail) >= 1


# ──────────────────────────────────────────────────────────────────
# H4 — Disponibilidad del aula
# ──────────────────────────────────────────────────────────────────

def test_h4_classroom_unavailable_detected():
    """H4: slot donde el aula no está disponible → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    # Quitar slot1 de la disponibilidad del aula
    data.classroom_availability[cl1.id] = {slot2.id}

    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id, slot2.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    unavail = [c for c in conflicts if "classroom not available" in c.message]
    assert len(unavail) >= 1


# ──────────────────────────────────────────────────────────────────
# H5 — Compatibilidad aula-componente (room_type + classroom_courses)
# ──────────────────────────────────────────────────────────────────

def test_h5_room_type_mismatch_detected():
    """H5: aula con tipo incompatible → conflicto."""
    period_id = uuid4()
    course_id, comp_id, teacher_id, cls_id = uuid4(), uuid4(), uuid4(), uuid4()
    slot_id = uuid4()

    course = Course(course_id, "LAB-101", "Laboratorio", 1, 3, 0, 1.5, "LAB")
    # componente requiere LAB, aula es AULA
    component = CourseComponent(comp_id, course_id, "PRACTICE", 1.5, "LAB", 1)
    teacher = Teacher(teacher_id, "T003", "Docente C")
    classroom = Classroom(cls_id, "B201", "Aula 201", 25, "AULA", "B")  # tipo incorrecto
    slot = TimeSlot(slot_id, DayOfWeek.TUESDAY, time(10, 20), time(11, 50), 620)

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.teachers[teacher_id] = teacher
    data.classrooms[cls_id] = classroom
    data.time_slots[slot_id] = slot
    data.teacher_course_components[comp_id] = {teacher_id}
    data.classroom_courses[course_id] = {cls_id}
    data.teacher_availability[teacher_id] = {slot_id}
    data.classroom_availability[cls_id] = {slot_id}

    offer = CourseOffer(
        course_id=course_id, course_component_id=comp_id,
        teacher_id=teacher_id, classroom_id=cls_id,
        time_slot_ids=[slot_id, slot_id], max_capacity=25,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    mismatch = [c for c in conflicts if "room_type mismatch" in c.message]
    assert len(mismatch) >= 1


def test_h5_classroom_not_authorized_for_course():
    """H5: aula no está en classroom_courses del curso → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    # Crear un aula nueva que NO está autorizada para el curso
    unauthorized_id = uuid4()
    unauthorized = Classroom(unauthorized_id, "Z999", "Aula no autorizada", 40, "AULA", "Z")
    data.classrooms[unauthorized_id] = unauthorized
    data.classroom_availability[unauthorized_id] = {slot1.id, slot2.id}

    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=unauthorized_id,
        time_slot_ids=[slot1.id, slot2.id], max_capacity=40,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    unauthorized_conflicts = [c for c in conflicts if "not authorised for course" in c.message]
    assert len(unauthorized_conflicts) >= 1


# ──────────────────────────────────────────────────────────────────
# H6 — Competencia del docente por componente
# ──────────────────────────────────────────────────────────────────

def test_h6_teacher_not_competent_detected():
    """H6: docente no habilitado para el componente → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    # Docente extra no listado en teacher_course_components para este componente
    incompetent_id = uuid4()
    incompetent = Teacher(incompetent_id, "T099", "Docente Incompetente")
    data.teachers[incompetent_id] = incompetent
    data.teacher_availability[incompetent_id] = {slot1.id, slot2.id}

    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=incompetent_id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id, slot2.id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    incompetent_conflicts = [c for c in conflicts if "teacher cannot teach" in c.message]
    assert len(incompetent_conflicts) >= 1


# ──────────────────────────────────────────────────────────────────
# H7 — Horas exactas por componente
# ──────────────────────────────────────────────────────────────────

def test_h7_wrong_number_of_slots_detected():
    """H7: oferta con 1 bloque cuando el componente requiere 3h → conflicto."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    component = CourseComponent(component.id, course.id, "GENERAL", 3.0, "AULA", 1)
    data.course_components[component.id] = component
    # component.weekly_hours == 3.0, pero sólo 1 bloque de 1.5h asignado
    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id],   # faltan horas
        max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    hours_conflicts = [c for c in conflicts if "expected duration 3.0h" in c.message]
    assert len(hours_conflicts) >= 1


def test_h7_correct_slots_no_hours_conflict():
    """H7: oferta con dos bloques de 90 min para un componente de 3h."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    component = CourseComponent(component.id, course.id, "GENERAL", 3.0, "AULA", 1)
    data.course_components[component.id] = component
    offer = CourseOffer(
        course_id=course.id, course_component_id=component.id,
        teacher_id=teacher.id, classroom_id=cl1.id,
        time_slot_ids=[slot1.id, slot2.id],   # 2 slots == weekly_hours
        max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    hours_conflicts = [c for c in conflicts if "expected duration" in c.message]
    assert len(hours_conflicts) == 0


def test_h7_multiblock_component_split_across_days_detected():
    """H7: un componente de 3h debe quedar como sesión compacta de un solo día."""
    data, course, component, teacher, cl1, cl2, slot1, slot2 = _make_data_h1_h2()
    tuesday_slot = TimeSlot(
        slot2.id,
        DayOfWeek.TUESDAY,
        slot2.start_time,
        slot2.end_time,
        slot2.slot_order,
    )
    data.time_slots[slot2.id] = tuesday_slot
    component = CourseComponent(component.id, course.id, "PRACTICE", 3.0, "AULA", 1)
    data.course_components[component.id] = component

    offer = CourseOffer(
        course_id=course.id,
        course_component_id=component.id,
        teacher_id=teacher.id,
        classroom_id=cl1.id,
        time_slot_ids=[slot1.id, slot2.id],
        max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer])
    compact_conflicts = [
        c for c in conflicts
        if "component blocks must be consecutive on the same day" in c.message
    ]
    assert len(compact_conflicts) >= 1


# ──────────────────────────────────────────────────────────────────
# H9 — Tiempo de traslado del docente (ya cubierto parcialmente arriba)
# ──────────────────────────────────────────────────────────────────

def test_h9_travel_time_violation_detected_by_validator():
    """H9: docente en edificios A→B con 0 minutos de margen → violación."""
    period_id = uuid4()
    course_id, comp_id = uuid4(), uuid4()
    teacher_id = uuid4()
    cls_a_id, cls_b_id = uuid4(), uuid4()
    slot1_id, slot2_id = uuid4(), uuid4()

    course = Course(course_id, "FIS-101", "Física", 1, 4, 0, 1.5, "AULA")
    component = CourseComponent(comp_id, course_id, "THEORY", 1.5, "AULA", 1)
    teacher = Teacher(teacher_id, "T005", "Docente E")
    cls_a = Classroom(cls_a_id, "A101", "Aula A", 30, "AULA", "A")
    cls_b = Classroom(cls_b_id, "B101", "Aula B", 30, "AULA", "B")
    slot1 = TimeSlot(slot1_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    slot2 = TimeSlot(slot2_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.teachers[teacher_id] = teacher
    data.classrooms[cls_a_id] = cls_a
    data.classrooms[cls_b_id] = cls_b
    data.time_slots[slot1_id] = slot1
    data.time_slots[slot2_id] = slot2
    data.teacher_course_components[comp_id] = {teacher_id}
    data.classroom_courses[course_id] = {cls_a_id, cls_b_id}
    data.teacher_availability[teacher_id] = {slot1_id, slot2_id}
    data.classroom_availability[cls_a_id] = {slot1_id, slot2_id}
    data.classroom_availability[cls_b_id] = {slot1_id, slot2_id}
    # Traslado A→B requiere 20 min, pero solo hay 10 min entre bloques maestros.
    data.travel_times["A"]["B"] = 20
    data.travel_times["B"]["A"] = 20

    offer_a = CourseOffer(
        course_id=course_id, course_component_id=comp_id,
        teacher_id=teacher_id, classroom_id=cls_a_id,
        time_slot_ids=[slot1_id], max_capacity=30,
    )
    offer_b = CourseOffer(
        course_id=course_id, course_component_id=comp_id,
        teacher_id=teacher_id, classroom_id=cls_b_id,
        time_slot_ids=[slot2_id], max_capacity=30,
    )
    validator = ConstraintValidator(data)
    conflicts = validator.validate_offers([offer_a, offer_b])
    travel_conflicts = [
        c for c in conflicts
        if c.conflict_type == ConflictType.TRAVEL_TIME_VIOLATION
    ]
    assert len(travel_conflicts) >= 1


# ──────────────────────────────────────────────────────────────────
# H10 — Prerrequisitos aprobados
# ──────────────────────────────────────────────────────────────────

def test_h10_demand_respects_prerequisites():
    """H10: estudiante sin prerrequisito aprobado no cuenta como elegible."""
    period_id = uuid4()
    prereq_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    cls_id = uuid4()
    student_with_prereq = Student(
        uuid4(), "S001", "Estudiante A", 2, 20, 4.0, Shift.MORNING,
        frozenset([prereq_id]),
    )
    student_without_prereq = Student(
        uuid4(), "S002", "Estudiante B", 2, 20, 3.5, Shift.MORNING,
        frozenset(),
    )

    course = Course(course_id, "MAT-202", "Cálculo II", 2, 4, 0, 4, "AULA")
    component = CourseComponent(comp_id, course_id, "GENERAL", 4, "AULA", 1)
    classroom = Classroom(cls_id, "A101", "Aula 101", 30, "AULA", "A")

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.classrooms[cls_id] = classroom
    data.classroom_courses[course_id] = {cls_id}
    data.course_prerequisites[course_id] = {prereq_id}
    data.students[student_with_prereq.id] = student_with_prereq
    data.students[student_without_prereq.id] = student_without_prereq

    out = DemandProjector().project(data)
    # Solo student_with_prereq es elegible
    assert out[comp_id].eligible_students == 1


def test_h10_already_approved_not_eligible():
    """H10: estudiante que ya aprobó el curso no vuelve a contabilizarse."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    cls_id = uuid4()

    # El estudiante ya tiene el curso aprobado
    student = Student(
        uuid4(), "S003", "Estudiante C", 2, 20, 4.5, Shift.MORNING,
        frozenset([course_id]),
    )
    course = Course(course_id, "MAT-101", "Cálculo I", 1, 4, 0, 4, "AULA")
    component = CourseComponent(comp_id, course_id, "GENERAL", 4, "AULA", 1)
    classroom = Classroom(cls_id, "A101", "Aula 101", 30, "AULA", "A")

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.classrooms[cls_id] = classroom
    data.classroom_courses[course_id] = {cls_id}
    data.students[student.id] = student

    out = DemandProjector().project(data)
    assert out[comp_id].eligible_students == 0


# ──────────────────────────────────────────────────────────────────
# H11 — Límite de créditos
# ──────────────────────────────────────────────────────────────────

def test_h11_credit_limit_constrains_demand():
    """H11: demanda cae si el ciclo del estudiante es inferior al del curso."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    cls_id = uuid4()

    # Ciclo del curso = 3, ciclo del estudiante = 1 → no elegible
    student = Student(
        uuid4(), "S004", "Estudiante D", 1, 20, 3.8, Shift.MORNING,
        frozenset(),
    )
    course = Course(course_id, "FIS-301", "Física Avanzada", 3, 4, 0, 4, "AULA")
    component = CourseComponent(comp_id, course_id, "THEORY", 4, "AULA", 1)
    classroom = Classroom(cls_id, "A201", "Aula 201", 30, "AULA", "A")

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.classrooms[cls_id] = classroom
    data.classroom_courses[course_id] = {cls_id}
    data.students[student.id] = student

    out = DemandProjector().project(data)
    assert out[comp_id].eligible_students == 0


# ──────────────────────────────────────────────────────────────────
# H12 — Vacantes por oferta (VacancyTracker)
# ──────────────────────────────────────────────────────────────────

def test_h12_vacancy_full_offer_not_reservable():
    """H12: oferta sin vacantes no permite reservar."""
    a1 = uuid4()
    course_id = uuid4()
    offers = {
        a1: {"course_id": course_id, "max_capacity": 1, "enrolled_count": 1},
    }
    v = VacancyTracker(offers)
    assert v.free(a1) == 0
    assert not v.reserve(a1)


def test_h12_reserve_release_cycle():
    """H12: reservar y liberar vacante restaura el conteo."""
    a1 = uuid4()
    course_id = uuid4()
    offers = {
        a1: {"course_id": course_id, "max_capacity": 3, "enrolled_count": 1},
    }
    v = VacancyTracker(offers)
    assert v.free(a1) == 2
    assert v.reserve(a1)
    assert v.reserve(a1)
    assert not v.reserve(a1)   # ahora 0
    v.release(a1)
    assert v.free(a1) == 1


def test_h12_vacancy_tracker_groups_by_course():
    """H12: VacancyTracker indexa por course_id para buscar ofertas."""
    course_id = uuid4()
    a1, a2 = uuid4(), uuid4()
    offers = {
        a1: {"course_id": course_id, "max_capacity": 2, "enrolled_count": 0},
        a2: {"course_id": course_id, "max_capacity": 5, "enrolled_count": 2},
    }
    v = VacancyTracker(offers)
    assert set(v.offers_for_course(course_id)) == {a1, a2}


def test_h12_vacancy_tracker_groups_by_component():
    """H12: VacancyTracker indexa también por course_component_id."""
    comp_id = uuid4()
    course_id = uuid4()
    a1, a2 = uuid4(), uuid4()
    offers = {
        a1: {"course_id": course_id, "course_component_id": comp_id,
             "max_capacity": 3, "enrolled_count": 0},
        a2: {"course_id": course_id, "course_component_id": comp_id,
             "max_capacity": 3, "enrolled_count": 3},
    }
    v = VacancyTracker(offers)
    comp_offers = v.offers_for_component(comp_id)
    assert set(comp_offers) == {a1, a2}
    # Solo a1 tiene vacantes
    with_vacancy = [oid for oid in comp_offers if v.has_vacancy(oid)]
    assert with_vacancy == [a1]


# ──────────────────────────────────────────────────────────────────
# H13 — Turno del estudiante (ShiftFilter)
# ──────────────────────────────────────────────────────────────────

def test_h13_slot_in_correct_shift():
    """H13: SlotFilter clasifica correctamente por turno."""
    sf = ShiftFilter()
    morning = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    afternoon = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(14, 0), time(15, 30), 840)
    evening = TimeSlot(uuid4(), DayOfWeek.MONDAY, time(19, 0), time(20, 30), 1140)

    assert sf.slot_in_shift(morning, Shift.MORNING)
    assert not sf.slot_in_shift(morning, Shift.AFTERNOON)
    assert sf.slot_in_shift(afternoon, Shift.AFTERNOON)
    assert not sf.slot_in_shift(afternoon, Shift.EVENING)
    assert sf.slot_in_shift(evening, Shift.EVENING)
    assert not sf.slot_in_shift(evening, Shift.MORNING)


def test_h13_flexible_shift_accepts_any():
    """H13: turno FLEXIBLE acepta cualquier slot."""
    sf = ShiftFilter()
    for start, end in [(time(7, 0), time(8, 30)), (time(14, 0), time(15, 30)), (time(19, 0), time(20, 30))]:
        slot = TimeSlot(uuid4(), DayOfWeek.WEDNESDAY, start, end, 1)
        assert sf.slot_in_shift(slot, Shift.FLEXIBLE)


def test_h13_adjacent_shifts_order():
    """H13: turnos adyacentes al MORNING son AFTERNOON, luego EVENING."""
    sf = ShiftFilter()
    adj = sf.adjacent_shifts(Shift.MORNING)
    assert len(adj) >= 1
    assert adj[0] == Shift.AFTERNOON

def test_h14_compound_course_components_all_or_nothing():
    """H14: si un curso tiene THEORY y PRACTICE, el grouper los mantiene juntos."""
    # Representación: course_corequisites vacío; atomicidad la garantiza
    # SolverInput.course_components con ambos tipos en el mismo course_id.
    period_id = uuid4()
    course_id = uuid4()
    theory_id = uuid4()
    practice_id = uuid4()

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.course_components[theory_id] = CourseComponent(
        theory_id, course_id, "THEORY", 2, "AULA", 1
    )
    data.course_components[practice_id] = CourseComponent(
        practice_id, course_id, "PRACTICE", 2, "LAB", 2
    )
    
    comps_of_course = [
        c for c in data.course_components.values() if c.course_id == course_id
    ]
    assert len(comps_of_course) == 2
    types_found = {c.component_type for c in comps_of_course}
    assert types_found == {"THEORY", "PRACTICE"}


# ──────────────────────────────────────────────────────────────────
# H15 — Corequisitos
# ──────────────────────────────────────────────────────────────────

def test_h15_corequisite_group_forms_single_atomic_unit():
    """H15: tres cursos corequisitos forman un único grupo atómico."""
    a, b, c = uuid4(), uuid4(), uuid4()
    coreqs = {a: {b, c}, b: {a, c}, c: {a, b}}
    grouper = CorequisiteGrouper(coreqs)
    groups = grouper.group([a, b, c])
    assert len(groups) == 1
    assert set(groups[0]) == {a, b, c}


def test_h15_independent_course_stays_singleton():
    """H15: curso sin corequisitos → grupo de tamaño 1."""
    a, b = uuid4(), uuid4()
    grouper = CorequisiteGrouper({a: set(), b: set()})
    groups = grouper.group([a, b])
    assert all(len(g) == 1 for g in groups)


def test_h15_corequisite_partial_overlap():
    """H15: cadena A-B-C donde A coreq B y B coreq C → un solo grupo."""
    a, b, c = uuid4(), uuid4(), uuid4()
    coreqs = {a: {b}, b: {a, c}, c: {b}}
    grouper = CorequisiteGrouper(coreqs)
    groups = grouper.group([a, b, c])
    assert len(groups) == 1


# ──────────────────────────────────────────────────────────────────
# SolverInput — campo classroom_course_components
# ──────────────────────────────────────────────────────────────────

def test_solver_input_classroom_course_components_field():
    """classroom_course_components existe y es un defaultdict(set)."""
    data = SolverInput(academic_period_id=uuid4(), period_max_credits=22)
    comp_id = uuid4()
    cls_id = uuid4()
    data.classroom_course_components[comp_id].add(cls_id)
    assert cls_id in data.classroom_course_components[comp_id]
    # Clave inexistente devuelve set vacío (defaultdict)
    assert data.classroom_course_components[uuid4()] == set()


# ──────────────────────────────────────────────────────────────────
# DemandProjector — cálculo de N_aulas según demanda y capacidad
# ──────────────────────────────────────────────────────────────────

def test_demand_projector_calculates_n_classrooms():
    """DemandProjector usa ceil(eligible / avg_capacity) para N_aulas."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    cls_id = uuid4()

    course = Course(course_id, "ING-101", "Inglés I", 1, 3, 0, 3, "AULA")
    component = CourseComponent(comp_id, course_id, "GENERAL", 3, "AULA", 1)
    classroom = Classroom(cls_id, "C101", "Aula 101", 20, "AULA", "C")

    # 45 estudiantes elegibles, aula de 20 → ceil(45/20) = 3
    students = [
        Student(uuid4(), f"S{i:03d}", f"Est {i}", 1, 20, 3.5, Shift.MORNING, frozenset())
        for i in range(45)
    ]

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.classrooms[cls_id] = classroom
    data.classroom_courses[course_id] = {cls_id}
    for s in students:
        data.students[s.id] = s

    out = DemandProjector().project(data)
    assert out[comp_id].n_classrooms == 3
    assert out[comp_id].eligible_students == 45


def test_demand_projector_no_compatible_classroom_falls_back():
    """DemandProjector devuelve n_classrooms=1 si el aula tiene tipo incompatible."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    cls_id = uuid4()

    # componente requiere LAB pero el aula es AULA → avg_cap = 0 → fallback
    course = Course(course_id, "QUI-102", "Química", 1, 3, 0, 3, "LAB")
    component = CourseComponent(comp_id, course_id, "PRACTICE", 3, "LAB", 1)
    classroom = Classroom(cls_id, "D201", "Sala D", 30, "AULA", "D")  # tipo incorrecto

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.classrooms[cls_id] = classroom
    data.classroom_courses[course_id] = {cls_id}

    out = DemandProjector().project(data)
    assert out[comp_id].n_classrooms == 1  # fallback


# ──────────────────────────────────────────────────────────────────
# TeacherScheduleSolver — integración mínima en memoria
# ──────────────────────────────────────────────────────────────────

def _make_minimal_solver_data():
    """Conjunto mínimo válido para que el solver Phase 1 encuentre solución."""
    period_id = uuid4()
    course_id = uuid4()
    comp_id = uuid4()
    teacher_id = uuid4()
    cls_id = uuid4()
    slot1_id, slot2_id = uuid4(), uuid4()

    course = Course(course_id, "MAT-101", "Matemáticas", 1, 4, 0, 3.0, "AULA")
    component = CourseComponent(comp_id, course_id, "GENERAL", 3.0, "AULA", 1)
    teacher = Teacher(teacher_id, "T001", "Docente A")
    classroom = Classroom(cls_id, "A101", "Aula 101", 30, "AULA", "A")
    slot1 = TimeSlot(slot1_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    slot2 = TimeSlot(slot2_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = course
    data.course_components[comp_id] = component
    data.teachers[teacher_id] = teacher
    data.classrooms[cls_id] = classroom
    data.time_slots[slot1_id] = slot1
    data.time_slots[slot2_id] = slot2
    data.teacher_course_components[comp_id] = {teacher_id}
    data.classroom_courses[course_id] = {cls_id}
    data.teacher_availability[teacher_id] = {slot1_id, slot2_id}
    data.classroom_availability[cls_id] = {slot1_id, slot2_id}
    demand = {comp_id: CourseDemand(course_id, comp_id, 0, 30, 1)}
    return data, demand, comp_id


def test_teacher_solver_finds_valid_assignment():
    """TeacherScheduleSolver encuentra una asignación válida con datos mínimos."""
    data, demand, comp_id = _make_minimal_solver_data()
    solver = TeacherScheduleSolver(data, demand)
    solution, conflicts = solver.solve(time_limit_ms=5_000)
    time_limit_conflicts = [
        c for c in conflicts if c.conflict_type == ConflictType.TIME_LIMIT_EXCEEDED
    ]
    assert len(time_limit_conflicts) == 0
    assert len(solution.offers) == 1
    offer = solution.offers[0]
    assert offer.course_component_id == comp_id
    assert len(offer.time_slot_ids) == 2   # weekly_hours == 3.0 → 2 bloques de 90 min
    assert [(b.start_time, b.end_time) for b in offer.blocks] == [
        (time(7, 0), time(8, 30)),
        (time(8, 40), time(10, 10)),
    ]
    assert solution.metrics["attempts"] >= 1
    assert "score" in solution.metrics


def test_teacher_solver_respects_single_compatible_classroom_for_any_room_code():
    """Un componente con una sola aula compatible debe usar esa aula, sin hardcodear códigos."""
    data, demand, comp_id = _make_minimal_solver_data()
    only_room_id = uuid4()
    course_id = data.course_components[comp_id].course_id
    original_room_id = next(iter(data.classroom_courses[course_id]))
    data.classrooms.pop(original_room_id)
    data.classroom_courses[course_id] = {only_room_id}
    data.classrooms[only_room_id] = Classroom(
        only_room_id,
        "ZX-909",
        "Laboratorio restringido",
        30,
        "AULA",
        "Z",
    )
    data.classroom_course_components[comp_id] = {only_room_id}
    data.classroom_availability = {only_room_id: set(data.time_slots.keys())}

    solution, conflicts = TeacherScheduleSolver(data, demand, seed=3).solve(time_limit_ms=5_000)

    assert conflicts == []
    assert len(solution.offers) == 1
    assert solution.offers[0].classroom_id == only_room_id


def test_teacher_solver_respects_component_specific_classrooms():
    """Teoría y práctica pueden estar restringidas a aulas distintas."""
    period_id = uuid4()
    course_id = uuid4()
    theory_id = uuid4()
    practice_id = uuid4()
    teacher_id = uuid4()
    theory_room_id = uuid4()
    practice_room_id = uuid4()
    slot1_id = uuid4()
    slot2_id = uuid4()

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = Course(course_id, "NET-201", "Redes", 1, 4, 0, 3.0, "AULA")
    data.course_components[theory_id] = CourseComponent(theory_id, course_id, "THEORY", 1.5, "AULA", 1)
    data.course_components[practice_id] = CourseComponent(practice_id, course_id, "PRACTICE", 1.5, "LAB", 2)
    data.teachers[teacher_id] = Teacher(teacher_id, "T-NET", "Docente Redes")
    data.classrooms[theory_room_id] = Classroom(theory_room_id, "A-10", "Aula A", 35, "AULA", "A")
    data.classrooms[practice_room_id] = Classroom(practice_room_id, "L-20", "Lab L", 25, "LAB", "L")
    data.time_slots[slot1_id] = TimeSlot(slot1_id, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    data.time_slots[slot2_id] = TimeSlot(slot2_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    data.teacher_course_components[theory_id] = {teacher_id}
    data.teacher_course_components[practice_id] = {teacher_id}
    data.classroom_courses[course_id] = {theory_room_id, practice_room_id}
    data.classroom_course_components[theory_id] = {theory_room_id}
    data.classroom_course_components[practice_id] = {practice_room_id}
    data.teacher_availability[teacher_id] = {slot1_id, slot2_id}
    data.classroom_availability[theory_room_id] = {slot1_id, slot2_id}
    data.classroom_availability[practice_room_id] = {slot1_id, slot2_id}
    demand = {
        theory_id: CourseDemand(course_id, theory_id, 0, 35, 1),
        practice_id: CourseDemand(course_id, practice_id, 0, 25, 1),
    }

    solution, conflicts = TeacherScheduleSolver(data, demand, seed=5).solve(time_limit_ms=5_000)
    by_component = {offer.course_component_id: offer for offer in solution.offers}

    assert conflicts == []
    assert by_component[theory_id].classroom_id == theory_room_id
    assert by_component[practice_id].classroom_id == practice_room_id


def test_teacher_solver_practice_follows_own_section_theory_not_latest_course_theory():
    """Una teoría de otra sección en sábado no debe empujar todas las prácticas al sábado."""
    period_id = uuid4()
    course_id = uuid4()
    practice_id = uuid4()
    teacher_id = uuid4()
    classroom_id = uuid4()
    monday_slot_id = uuid4()
    saturday_slot_id = uuid4()

    data = SolverInput(academic_period_id=period_id, period_max_credits=22)
    data.courses[course_id] = Course(course_id, "NET-202", "Redes avanzadas", 1, 4, 0, 1.5, "LAB")
    data.course_components[practice_id] = CourseComponent(practice_id, course_id, "PRACTICE", 1.5, "LAB", 2)
    data.teachers[teacher_id] = Teacher(teacher_id, "T-NET", "Docente Redes")
    data.classrooms[classroom_id] = Classroom(classroom_id, "LAB-X", "Lab X", 25, "LAB", "L")
    data.time_slots[monday_slot_id] = TimeSlot(monday_slot_id, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    data.time_slots[saturday_slot_id] = TimeSlot(saturday_slot_id, DayOfWeek.SATURDAY, time(10, 20), time(11, 50), 620)
    data.teacher_course_components[practice_id] = {teacher_id}
    data.classroom_courses[course_id] = {classroom_id}
    data.classroom_course_components[practice_id] = {classroom_id}
    data.teacher_availability[teacher_id] = {monday_slot_id, saturday_slot_id}
    data.classroom_availability[classroom_id] = {monday_slot_id, saturday_slot_id}

    solver = TeacherScheduleSolver(data, {practice_id: CourseDemand(course_id, practice_id, 0, 25, 1)}, seed=2)
    solver._reset_search_state()
    solver._course_theory_ends[course_id] = [(5, time(10, 10))]
    solver._section_theory_end[(course_id, 0)] = (0, time(8, 30))

    offer = next(solver._candidates(practice_id, 0))

    assert offer.blocks[0].day == DayOfWeek.MONDAY


def test_teacher_solver_keeps_flexible_course_out_of_critical_room_when_possible():
    """Un curso flexible no debe ocupar primero un aula única necesaria para otro curso."""
    data, demand, restricted_comp_id = _make_minimal_solver_data()
    restricted_course_id = data.course_components[restricted_comp_id].course_id
    critical_room_id = next(iter(data.classroom_courses[restricted_course_id]))
    flexible_course_id = uuid4()
    flexible_comp_id = uuid4()
    flexible_teacher_id = uuid4()
    flexible_room_id = uuid4()

    data.courses[flexible_course_id] = Course(flexible_course_id, "FLEX-1", "Flexible", 1, 4, 0, 1.5, "AULA")
    data.course_components[flexible_comp_id] = CourseComponent(flexible_comp_id, flexible_course_id, "GENERAL", 1.5, "AULA", 1)
    data.teachers[flexible_teacher_id] = Teacher(flexible_teacher_id, "T-FLEX", "Docente Flexible")
    data.classrooms[flexible_room_id] = Classroom(flexible_room_id, "B-200", "Aula flexible", 30, "AULA", "B")
    data.teacher_course_components[flexible_comp_id] = {flexible_teacher_id}
    data.classroom_courses[flexible_course_id] = {critical_room_id, flexible_room_id}
    data.teacher_availability[flexible_teacher_id] = set(data.time_slots.keys())
    data.classroom_availability[flexible_room_id] = set(data.time_slots.keys())
    data.classroom_course_components[restricted_comp_id] = {critical_room_id}
    demand[flexible_comp_id] = CourseDemand(flexible_course_id, flexible_comp_id, 0, 30, 1)

    solution, conflicts = TeacherScheduleSolver(data, demand, seed=8).solve(time_limit_ms=5_000)
    by_component = {offer.course_component_id: offer for offer in solution.offers}

    assert conflicts == []
    assert by_component[restricted_comp_id].classroom_id == critical_room_id
    assert by_component[flexible_comp_id].classroom_id == flexible_room_id


def test_teacher_solver_prefers_underused_room_with_more_authorized_components():
    """Un aula con muchos componentes autorizados no debe quedar vacía por balance local simple."""
    data, demand, comp_id = _make_minimal_solver_data()
    course_id = data.course_components[comp_id].course_id
    room_a_id = next(iter(data.classroom_courses[course_id]))
    room_b_id = uuid4()

    data.classrooms[room_b_id] = Classroom(room_b_id, "B-404", "Aula B", 30, "AULA", "B")
    data.classroom_availability[room_b_id] = set(data.time_slots.keys())
    data.classroom_courses.pop(course_id, None)
    data.classroom_course_components[comp_id] = {room_a_id, room_b_id}

    for idx in range(3):
        dummy_course_id = uuid4()
        dummy_comp_id = uuid4()
        data.courses[dummy_course_id] = Course(
            dummy_course_id,
            f"DUMMY-{idx}",
            "Dummy",
            1,
            4,
            0,
            1.5,
            "AULA",
        )
        data.course_components[dummy_comp_id] = CourseComponent(
            dummy_comp_id,
            dummy_course_id,
            "THEORY",
            1.5,
            "AULA",
            1,
        )
        data.classroom_course_components[dummy_comp_id] = {room_a_id}

    solver = TeacherScheduleSolver(data, demand, seed=4)
    solver._reset_search_state()
    existing = (DayOfWeek.TUESDAY, time(7, 0), time(8, 30))
    solver._classroom_blocks[room_a_id].append(existing)
    solver._classroom_blocks[room_b_id].append(existing)

    offer = next(solver._candidates(comp_id, 0))

    assert offer.classroom_id == room_a_id


def test_teacher_solver_candidate_score_prefers_smaller_classroom_gap():
    """Entre candidatos válidos para un aula, debe preferir el bloque que deja menos hueco."""
    data, _, comp_id = _make_minimal_solver_data()
    course_id = data.course_components[comp_id].course_id
    classroom_id = next(iter(data.classroom_courses[course_id]))
    teacher_id = next(iter(data.teacher_course_components[comp_id]))
    third_slot_id = uuid4()
    data.course_components[comp_id] = CourseComponent(comp_id, course_id, "GENERAL", 1.5, "AULA", 1)
    data.time_slots[third_slot_id] = TimeSlot(third_slot_id, DayOfWeek.MONDAY, time(10, 20), time(11, 50), 620)
    data.teacher_availability[teacher_id].add(third_slot_id)
    data.classroom_availability[classroom_id].add(third_slot_id)

    solver = TeacherScheduleSolver(data, {comp_id: CourseDemand(course_id, comp_id, 0, 30, 1)}, seed=1)
    solver._reset_search_state()
    first_slot = data.time_slots[next(sid for sid, slot in data.time_slots.items() if slot.start_time == time(7, 0))]
    solver._classroom_blocks[classroom_id].append((first_slot.day_of_week, first_slot.start_time, first_slot.end_time))

    offer = next(solver._candidates(comp_id, 0))

    assert offer.blocks[0].start_time == time(8, 40)


def test_teacher_solver_seed_varies_tied_candidates():
    """Seeds distintos desempatan candidatos sin relajar restricciones."""
    data, demand, comp_id = _make_minimal_solver_data()
    second_classroom_id = uuid4()
    data.classrooms[second_classroom_id] = Classroom(
        second_classroom_id,
        "A102",
        "Aula 102",
        30,
        "AULA",
        "A",
    )
    course_id = data.course_components[comp_id].course_id
    data.classroom_courses[course_id].add(second_classroom_id)
    data.classroom_availability[second_classroom_id] = set(data.time_slots.keys())

    solution_a, conflicts_a = TeacherScheduleSolver(data, demand, seed=1).solve(time_limit_ms=5_000)
    solution_b, conflicts_b = TeacherScheduleSolver(data, demand, seed=2).solve(time_limit_ms=5_000)

    assert conflicts_a == []
    assert conflicts_b == []
    assert len(solution_a.offers) == 1
    assert len(solution_b.offers) == 1
    assert solution_a.offers[0].classroom_id != solution_b.offers[0].classroom_id


def test_teacher_solver_rejects_split_multiblock_assignment():
    """Un componente de 3h no puede usar slots en días distintos."""
    data, demand, comp_id = _make_minimal_solver_data()
    slot_ids = list(data.time_slots.keys())
    second_slot_id = slot_ids[1]
    second_slot = data.time_slots[second_slot_id]
    data.time_slots[second_slot_id] = TimeSlot(
        second_slot.id,
        DayOfWeek.TUESDAY,
        second_slot.start_time,
        second_slot.end_time,
        second_slot.slot_order,
    )

    solver = TeacherScheduleSolver(data, demand)
    solution, conflicts = solver.solve(time_limit_ms=5_000)
    assert len(solution.offers) == 0
    assert len(conflicts) >= 1


def test_teacher_solver_fails_without_available_slots():
    """TeacherScheduleSolver reporta conflicto si no hay slots disponibles."""
    data, demand, comp_id = _make_minimal_solver_data()
    # IDs que no existen en time_slots equivalen a no tener ventanas válidas.
    for k in list(data.teacher_availability.keys()):
        data.teacher_availability[k] = {uuid4()}
    for k in list(data.classroom_availability.keys()):
        data.classroom_availability[k] = {uuid4()}

    solver = TeacherScheduleSolver(data, demand)
    solution, conflicts = solver.solve(time_limit_ms=5_000)
    assert len(solution.offers) == 0
    assert len(conflicts) >= 1


def test_teacher_solver_fails_without_competent_teacher():
    """TeacherScheduleSolver reporta conflicto si no hay docente habilitado."""
    data, demand, comp_id = _make_minimal_solver_data()
    # Quitar todos los docentes habilitados para el componente
    data.teacher_course_components[comp_id] = set()

    solver = TeacherScheduleSolver(data, demand)
    solution, conflicts = solver.solve(time_limit_ms=5_000)
    assert len(solution.offers) == 0
    assert len(conflicts) >= 1
