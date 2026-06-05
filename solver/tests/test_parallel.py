"""Tests del portafolio paralelo de la Fase 1 (parallel_solver)."""
from __future__ import annotations

import time as _time
from datetime import time
from uuid import uuid4

from app.domain.models import (
    Classroom,
    Course,
    CourseComponent,
    DayOfWeek,
    Teacher,
    TimeSlot,
)
from app.domain.solver_input import SolverInput
from app.services.demand_projector import CourseDemand
from app.services.parallel_solver import solve_phase1_parallel


def _make_feasible_data():
    """Dataset en memoria con 2 cursos teóricos asignables (sin BD).

    Cada componente tiene 1 docente, 1 aula y 2 bloques maestros consecutivos
    disponibles, por lo que una corrida factible coloca 2 ofertas.
    """
    course_a = uuid4()
    course_b = uuid4()
    comp_a = uuid4()
    comp_b = uuid4()
    teacher = uuid4()
    room = uuid4()
    slot1 = uuid4()
    slot2 = uuid4()

    data = SolverInput(academic_period_id=uuid4(), period_max_credits=22)
    data.courses[course_a] = Course(course_a, "CUR-A", "Curso A", 1, 4, 0, 1.5, "AULA")
    data.courses[course_b] = Course(course_b, "CUR-B", "Curso B", 1, 4, 0, 1.5, "AULA")
    data.course_components[comp_a] = CourseComponent(comp_a, course_a, "THEORY", 1.5, "AULA", 1)
    data.course_components[comp_b] = CourseComponent(comp_b, course_b, "THEORY", 1.5, "AULA", 1)
    data.teachers[teacher] = Teacher(teacher, "T-1", "Docente")
    data.classrooms[room] = Classroom(room, "A101", "A101", 40, "AULA", "A")
    data.time_slots[slot1] = TimeSlot(slot1, DayOfWeek.MONDAY, time(7, 0), time(8, 30), 420)
    data.time_slots[slot2] = TimeSlot(slot2, DayOfWeek.MONDAY, time(8, 40), time(10, 10), 520)
    data.teacher_course_components[comp_a] = {teacher}
    data.teacher_course_components[comp_b] = {teacher}
    data.classroom_course_components[comp_a] = {room}
    data.classroom_course_components[comp_b] = {room}
    data.teacher_availability[teacher] = {slot1, slot2}
    data.classroom_availability[room] = {slot1, slot2}

    demand = {
        comp_a: CourseDemand(course_a, comp_a, 0, 40, 1),
        comp_b: CourseDemand(course_b, comp_b, 0, 40, 1),
    }
    return data, demand


def test_parallel_produces_complete_solution_and_metrics():
    data, demand = _make_feasible_data()
    solution, conflicts = solve_phase1_parallel(
        data, demand, time_limit_ms=4_000, seed=7, n_workers=2, n_cycles=2,
    )
    # Dataset factible: ambas ofertas colocadas, sin conflictos.
    assert len(solution.offers) == 2
    assert conflicts == []
    # Métricas propias del portafolio paralelo.
    assert solution.metrics.get("parallel_workers") == 2
    assert solution.metrics.get("parallel_cycles") == 2
    assert solution.metrics.get("parallel_waves_run", 0) >= 1
    assert solution.metrics.get("missing_offers") == 0
    # Agregados: cuentan el trabajo de TODOS los ciclos, no solo el ganador.
    assert solution.metrics.get("total_attempts", 0) >= int(solution.metrics.get("attempts", 0))
    assert solution.metrics.get("hard_restarts") == solution.metrics.get("parallel_cycles") - 1


def test_parallel_falls_back_to_sequential_when_single_cycle():
    data, demand = _make_feasible_data()
    solution, conflicts = solve_phase1_parallel(
        data, demand, time_limit_ms=4_000, seed=3, n_workers=1, n_cycles=1,
    )
    # La ruta secuencial coloca las ofertas pero no emite métricas de paralelismo.
    assert len(solution.offers) == 2
    assert "parallel_workers" not in solution.metrics


def test_parallel_respects_wall_clock_budget():
    data, demand = _make_feasible_data()
    start = _time.monotonic()
    solution, _ = solve_phase1_parallel(
        data, demand, time_limit_ms=3_000, seed=1, n_workers=2, n_cycles=2,
        time_factor=0.6,
    )
    elapsed_ms = (_time.monotonic() - start) * 1000
    # Una sola oleada de 0.6*3000=1800ms por ciclo; margen amplio por arranque del pool.
    assert elapsed_ms < 3_000 + 4_000
    assert len(solution.offers) == 2


def test_parallel_reproducible_quality_for_feasible_dataset():
    data, demand = _make_feasible_data()
    sol1, _ = solve_phase1_parallel(data, demand, time_limit_ms=3_000, seed=42, n_workers=2, n_cycles=2)
    data2, demand2 = _make_feasible_data()
    sol2, _ = solve_phase1_parallel(data2, demand2, time_limit_ms=3_000, seed=42, n_workers=2, n_cycles=2)
    # En un dataset trivial factible ambos llegan a la solución óptima completa.
    assert sol1.metrics.get("missing_offers") == sol2.metrics.get("missing_offers") == 0
    assert len(sol1.offers) == len(sol2.offers) == 2
