"""Fase 2 estudiante: variación entre generaciones y exclusión de borradores."""
from __future__ import annotations

from datetime import time
from uuid import UUID, uuid4

from app.domain.models import (
    Classroom,
    Course,
    CourseComponent,
    DayOfWeek,
    Shift,
    Student,
    TimeSlot,
)
from app.domain.solver_input import SolverInput
from app.services.student_solver import StudentScheduleSolver
from app.services.vacancy_tracker import VacancyTracker

PERIOD = uuid4()
N_SECTIONS = 5


def _build() -> tuple[SolverInput, dict[UUID, dict], Student]:
    course_id = uuid4()
    component_id = uuid4()
    teacher_id = uuid4()

    data = SolverInput(academic_period_id=PERIOD, period_max_credits=24)
    data.courses[course_id] = Course(
        id=course_id, code="MAT101", name="Matemática", cycle=1, credits=4,
        required_credits=0, weekly_hours=4, required_room_type="THEORY",
    )
    data.course_components[component_id] = CourseComponent(
        id=component_id, course_id=course_id, component_type="THEORY",
        weekly_hours=4, required_room_type="THEORY", sort_order=0,
    )

    days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]
    offers: dict[UUID, dict] = {}
    for i in range(N_SECTIONS):
        slot_id = uuid4()
        data.time_slots[slot_id] = TimeSlot(
            id=slot_id, day_of_week=days[i], start_time=time(8, 0),
            end_time=time(10, 0), slot_order=1,
        )
        classroom_id = uuid4()
        data.classrooms[classroom_id] = Classroom(
            id=classroom_id, code=f"A{i}", name=f"Aula {i}", capacity=40,
            room_type="THEORY", building_code="A",
        )
        aid = uuid4()
        offers[aid] = {
            "course_id": course_id,
            "course_component_id": component_id,
            "teacher_id": teacher_id,
            "classroom_id": classroom_id,
            "max_capacity": 40,
            "enrolled_count": 0,
            "time_slot_ids": [slot_id],
        }

    student = Student(
        id=uuid4(), code="U001", full_name="Alumno", cycle=1, credit_limit=24,
        gpa=5.0, preferred_shifts=frozenset(), completed_course_ids=frozenset(),
    )
    data.students[student.id] = student
    return data, offers, student


def _pick(data, offers, student, *, seed, exclude=None) -> UUID:
    solver = StudentScheduleSolver(
        data, offers, VacancyTracker(offers), seed=seed, top_k=N_SECTIONS,
    )
    sol, _ = solver.solve_one(student, exclude_assignments=exclude)
    assert sol.items, "se esperaba al menos un curso asignado"
    return sol.items[0].component_assignments[0][1]


def test_different_seeds_produce_different_schedules():
    data, offers, student = _build()
    chosen = {_pick(data, offers, student, seed=s) for s in range(12)}
    # Con 5 secciones y top_k=5, distintos seeds deben elegir secciones distintas.
    assert len(chosen) > 1


def test_exclude_avoids_previous_draft_assignment():
    data, offers, student = _build()
    first = _pick(data, offers, student, seed=1)
    second = _pick(data, offers, student, seed=1, exclude=frozenset({first}))
    assert second != first


def test_respects_credit_limit():
    data, offers, student = _build()
    # Límite de créditos a 0: no debe asignar nada.
    capped = Student(
        id=student.id, code=student.code, full_name=student.full_name,
        cycle=student.cycle, credit_limit=0, gpa=student.gpa,
        preferred_shifts=student.preferred_shifts,
        completed_course_ids=student.completed_course_ids,
    )
    data.students[capped.id] = capped
    solver = StudentScheduleSolver(data, offers, VacancyTracker(offers), seed=0)
    sol, _ = solver.solve_one(capped)
    assert not sol.items
