"""SolverOrchestrator — top-level coordinator for Phase 1 and Phase 2 runs."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from uuid import UUID

from app.core.config import get_settings
from app.core.events import bus
from app.core.logging import get_logger
from app.domain.models import Conflict, ConflictType, TeachingScheduleSolution
from app.domain.solver_input import SolverInput
from app.infrastructure.input_loader import SolverInputLoader
from app.infrastructure.persistence import (
    consume_generation_reservation,
    create_solver_run,
    finish_solver_run,
    load_offer_vacancies,
    persist_student_schedule,
    persist_teaching_schedule,
    report_conflicts,
    set_solver_run_input_hash,
)
from app.services.constraint_validator import ConstraintValidator
from app.services.demand_projector import DemandProjector
from app.services.student_solver import StudentScheduleSolver
from app.services.teacher_solver import TeacherScheduleSolver
from app.services.vacancy_tracker import VacancyTracker

log = get_logger(__name__)

PHASE1_SECTION_COUNT = 3


@dataclass
class SolverRunRequest:
    academic_period_id: UUID
    run_type: str  # 'TEACHER' | 'STUDENT'
    student_id: UUID | None = None
    requested_by: UUID | None = None
    time_limit_ms: int = 20_000
    seed: int | None = None
    keep_existing_drafts: bool = False
    rate_limit_reservation_id: UUID | None = None
    classroom_ids: list[UUID] | None = None


_SOLVER_OVERHEAD_BUFFER_MS = 500


@dataclass
class SolverRunResult:
    solver_run_id: UUID
    status: str
    summary: str
    conflicts: list[Conflict]


class SolverOrchestrator:
    def __init__(self) -> None:
        self._loader = SolverInputLoader()

    @staticmethod
    def _emit(run_id: UUID, stage: str, **extra) -> None:
        evt = {"type": "progress", "run_id": str(run_id), "stage": stage}
        evt.update(extra)
        bus.publish(f"run:{run_id}", evt)

    def run(self, req: SolverRunRequest) -> SolverRunResult:
        if req.run_type not in ("TEACHER", "STUDENT"):
            raise ValueError(f"invalid run_type: {req.run_type}")

        run_id = create_solver_run(
            run_type=req.run_type,
            academic_period_id=req.academic_period_id,
            student_id=req.student_id,
            requested_by=req.requested_by,
            time_limit_ms=req.time_limit_ms,
            input_hash=None,  
            seed=req.seed,
        )
        self._emit(run_id, "created", run_type=req.run_type)
        return self.run_existing(run_id, req)

    def run_existing(self, run_id: UUID, req: SolverRunRequest) -> SolverRunResult:
        """Execute an already-created solver_run (used by the async API path)."""
        if req.run_type not in ("TEACHER", "STUDENT"):
            raise ValueError(f"invalid run_type: {req.run_type}")
        self._emit(run_id, "started", run_type=req.run_type)
        try:
            if req.run_type == "TEACHER":
                return self._run_phase1(run_id, req)
            return self._run_phase2(run_id, req)
        except Exception as exc:  # noqa: BLE001
            log.exception("solver run %s crashed", run_id)
            conflict = Conflict(ConflictType.INTERNAL_ERROR, str(exc))
            report_conflicts(run_id, [conflict])
            finish_solver_run(run_id, status="FAILED", summary=f"internal error: {exc}")
            self._emit(run_id, "finished", status="FAILED", summary=str(exc),
                       conflict_count=1)
            return SolverRunResult(run_id, "FAILED", str(exc), [conflict])

    def _run_phase1(self, run_id: UUID, req: SolverRunRequest) -> SolverRunResult:
        if req.rate_limit_reservation_id is not None:
            if req.requested_by is None:
                conflict = Conflict(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE,
                    "requested_by is required when a generation reservation is provided",
                )
                report_conflicts(run_id, [conflict])
                finish_solver_run(run_id, status="FAILED", summary=conflict.message)
                self._emit(run_id, "finished", status="FAILED", conflict_count=1)
                return SolverRunResult(run_id, "FAILED", conflict.message, [conflict])
            if not consume_generation_reservation(
                reservation_id=req.rate_limit_reservation_id,
                actor_id=req.requested_by,
                academic_period_id=req.academic_period_id,
            ):
                conflict = Conflict(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE,
                    "invalid or expired generation reservation",
                )
                report_conflicts(run_id, [conflict])
                finish_solver_run(run_id, status="FAILED", summary=conflict.message)
                self._emit(run_id, "finished", status="FAILED", conflict_count=1)
                return SolverRunResult(run_id, "FAILED", conflict.message, [conflict])

        self._emit(run_id, "loading_inputs")
        data = self._loader.load(
            req.academic_period_id, load_students=False
        )
        self._tag_input_hash(run_id, data)
        self._emit(run_id, "inputs_loaded",
                   courses=len(data.courses),
                   teachers=len(data.teachers),
                   classrooms=len(data.classrooms),
                   students=len(data.students))

        if req.classroom_ids:
            self._restrict_classrooms(data, set(req.classroom_ids))
            self._emit(run_id, "classrooms_filtered", classrooms=len(data.classrooms))
            if not data.courses or not data.course_components:
                conflict = Conflict(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE,
                    "No hay cursos autorizados para las aulas seleccionadas",
                )
                report_conflicts(run_id, [conflict])
                finish_solver_run(run_id, status="FAILED", summary=conflict.message)
                self._emit(run_id, "finished", status="FAILED", conflict_count=1)
                return SolverRunResult(run_id, "FAILED", conflict.message, [conflict])

        self._emit(run_id, "projecting_demand")
        demand = DemandProjector().project(data)
        self._apply_phase1_section_rules(data, demand)
        solve_budget_ms = max(1_000, req.time_limit_ms - _SOLVER_OVERHEAD_BUFFER_MS)

        settings = get_settings()
        if settings.parallel_enabled:
            from app.services.parallel_solver import solve_phase1_parallel

            self._emit(run_id, "solving_phase1",
                       workers=settings.parallel_workers, cycles=settings.parallel_cycles)
            solution, solver_diagnostics = solve_phase1_parallel(
                data, demand,
                time_limit_ms=solve_budget_ms,
                seed=req.seed,
                n_workers=settings.parallel_workers,
                n_cycles=settings.parallel_cycles,
                time_factor=settings.parallel_time_factor,
            )
        else:
            self._emit(run_id, "solving_phase1")
            solver = TeacherScheduleSolver(data, demand, seed=req.seed)
            solution, solver_diagnostics = solver.solve(time_limit_ms=solve_budget_ms)

        validator = ConstraintValidator(data)
        validation_conflicts = validator.validate_offers(solution.offers)

        _WARN_ONLY_TYPES = {ConflictType.THEORY_AFTER_PRACTICE}
        hard_conflicts = [c for c in validation_conflicts if c.conflict_type not in _WARN_ONLY_TYPES]
        warn_conflicts = [c for c in validation_conflicts if c.conflict_type in _WARN_ONLY_TYPES]

        if hard_conflicts or not solution.offers:
            conflicts = [*solver_diagnostics, *validation_conflicts]
            report_conflicts(run_id, conflicts)
            finish_solver_run(run_id, status="FAILED",
                              summary=f"phase1 generated {len(solution.offers)} offers with {len(conflicts)} conflicts")
            self._emit(run_id, "finished", status="FAILED",
                       offers=len(solution.offers), conflict_count=len(conflicts))
            return SolverRunResult(run_id, "FAILED", "phase1 partial/failed", conflicts)

        if warn_conflicts:
            report_conflicts(run_id, warn_conflicts)

        self._emit(run_id, "persisting", offers=len(solution.offers))
        capacities = {cid: c.capacity for cid, c in data.classrooms.items()}
        schedule_id = persist_teaching_schedule(
            academic_period_id=req.academic_period_id,
            created_by=req.requested_by,
            solution=solution,
            classroom_capacities=capacities,
            keep_existing_drafts=req.keep_existing_drafts,
        )
        finish_solver_run(run_id, status="SUCCEEDED",
                          summary=self._phase1_summary(solution, solver_diagnostics),
                          teaching_schedule_id=schedule_id)
        self._emit(run_id, "finished", status="SUCCEEDED",
                   offers=len(solution.offers), conflict_count=len(solver_diagnostics))
        return SolverRunResult(run_id, "SUCCEEDED",
                               f"{len(solution.offers)} offers", [])

    def _run_phase2(self, run_id: UUID, req: SolverRunRequest) -> SolverRunResult:
        self._emit(run_id, "loading_inputs")
        data = self._loader.load(
            req.academic_period_id,
            load_students=True,
            student_id=req.student_id,
        )
        self._tag_input_hash(run_id, data)
        self._emit(run_id, "inputs_loaded", students=len(data.students))

        if data.confirmed_teaching_schedule_id is None:
            conflict = Conflict(
                ConflictType.NO_ASSIGNMENT_POSSIBLE,
                "no CONFIRMED teaching_schedule for academic period",
            )
            report_conflicts(run_id, [conflict])
            finish_solver_run(run_id, status="FAILED",
                              summary="no confirmed teaching schedule")
            self._emit(run_id, "finished", status="FAILED", conflict_count=1,
                       reason="no_confirmed_teaching_schedule")
            return SolverRunResult(run_id, "FAILED",
                                   "no confirmed teaching schedule", [conflict])

        self._emit(run_id, "solving_phase2")
        offers = load_offer_vacancies(data.confirmed_teaching_schedule_id)
        vacancy = VacancyTracker(offers)
        solver = StudentScheduleSolver(data, offers, vacancy)
        solutions, conflicts = solver.solve_batch(time_limit_ms=max(1_000, req.time_limit_ms - _SOLVER_OVERHEAD_BUFFER_MS))

        self._emit(run_id, "persisting",
                   placed=sum(1 for s in solutions if s.items))
        for sol in solutions:
            if sol.items:
                persist_student_schedule(
                    student_id=sol.student_id,
                    academic_period_id=req.academic_period_id,
                    generated_by=req.requested_by,
                    items=sol.items,
                )

        report_conflicts(run_id, conflicts)
        succeeded = bool(solutions) and not any(
            c.conflict_type == ConflictType.TIME_LIMIT_EXCEEDED for c in conflicts
        )
        status = "SUCCEEDED" if succeeded and not conflicts else "FAILED"
        summary = f"phase2 placed {sum(1 for s in solutions if s.items)} students; {len(conflicts)} conflicts"
        finish_solver_run(run_id, status=status, summary=summary)
        self._emit(run_id, "finished", status=status,
                   placed=sum(1 for s in solutions if s.items),
                   conflict_count=len(conflicts))
        return SolverRunResult(run_id, status, summary, conflicts)

    def _tag_input_hash(self, run_id: UUID, data: SolverInput) -> None:
        payload = {
            "period": str(data.academic_period_id),
            "courses": sorted(str(c) for c in data.courses.keys()),
            "course_components": sorted(str(c) for c in data.course_components.keys()),
            "teachers": sorted(str(t) for t in data.teachers.keys()),
            "classrooms": sorted(str(r) for r in data.classrooms.keys()),
            "time_slots": sorted(str(s) for s in data.time_slots.keys()),
            "max_credits": data.period_max_credits,
        }
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        set_solver_run_input_hash(run_id, digest)

    @staticmethod
    def _restrict_classrooms(data: SolverInput, classroom_ids: set[UUID]) -> None:
        selected_classroom_ids = set(classroom_ids)
        data.classrooms = {
            classroom_id: classroom
            for classroom_id, classroom in data.classrooms.items()
            if classroom_id in selected_classroom_ids
        }

        selected_classroom_ids = set(data.classrooms.keys())

        selected_component_ids = {
            component_id
            for component_id, allowed in data.classroom_course_components.items()
            if component_id in data.course_components and allowed & selected_classroom_ids
        }
        component_scoped_rooms_by_course: dict[UUID, set[UUID]] = {}
        for component_id in selected_component_ids:
            component = data.course_components[component_id]
            component_scoped_rooms_by_course.setdefault(component.course_id, set()).update(
                data.classroom_course_components.get(component_id, set()) & selected_classroom_ids
            )

        data.classroom_courses = {
            course_id: (allowed & selected_classroom_ids)
            - component_scoped_rooms_by_course.get(course_id, set())
            for course_id, allowed in data.classroom_courses.items()
        }
        data.classroom_courses = {
            course_id: allowed
            for course_id, allowed in data.classroom_courses.items()
            if allowed
        }
        general_course_ids = set(data.classroom_courses.keys())
        component_scoped_courses = {
            data.course_components[component_id].course_id
            for component_id in selected_component_ids
        }
        allowed_course_ids = set(data.classroom_courses.keys()) | component_scoped_courses

        data.courses = {
            course_id: course
            for course_id, course in data.courses.items()
            if course_id in allowed_course_ids
        }
        allowed_component_ids = {
            component_id
            for component_id, component in data.course_components.items()
            if component_id in selected_component_ids
            or component.course_id in general_course_ids
        }
        data.course_components = {
            component_id: component
            for component_id, component in data.course_components.items()
            if component_id in allowed_component_ids
        }

        data.classroom_course_components = {
            component_id: allowed & selected_classroom_ids
            for component_id, allowed in data.classroom_course_components.items()
            if component_id in allowed_component_ids and allowed & selected_classroom_ids
        }
        data.teacher_courses = {
            course_id: {
                teacher_id for teacher_id in teacher_ids
                if teacher_id in data.teachers
            }
            for course_id, teacher_ids in data.teacher_courses.items()
            if course_id in allowed_course_ids
        }
        data.teacher_course_components = {
            component_id: {
                teacher_id for teacher_id in teacher_ids
                if teacher_id in data.teachers
            }
            for component_id, teacher_ids in data.teacher_course_components.items()
            if component_id in allowed_component_ids
        }
        data.classroom_availability = {
            classroom_id: slots
            for classroom_id, slots in data.classroom_availability.items()
            if classroom_id in selected_classroom_ids
        }
        data.course_prerequisites = {
            course_id: prerequisites & allowed_course_ids
            for course_id, prerequisites in data.course_prerequisites.items()
            if course_id in allowed_course_ids
        }
        data.course_corequisites = {
            course_id: corequisites & allowed_course_ids
            for course_id, corequisites in data.course_corequisites.items()
            if course_id in allowed_course_ids
        }

    @staticmethod
    def _apply_phase1_section_rules(
        data: SolverInput,
        demand: dict[UUID, object],
    ) -> None:
        for item in demand.values():
            rule = data.course_rules.get(item.course_id)
            max_sections = rule.max_sections if rule is not None else PHASE1_SECTION_COUNT
            item.n_classrooms = min(PHASE1_SECTION_COUNT, max_sections)

    @staticmethod
    def _phase1_summary(
        solution: TeachingScheduleSolution,
        diagnostics: list[Conflict],
    ) -> str:
        metrics = getattr(solution, "metrics", {}) or {}
        ls_part = ""
        if "local_search_iters" in metrics:
            ls_part = (
                f"; ls_iters={metrics.get('local_search_iters', 0)}"
                f"; ls_accepted={metrics.get('local_search_accepted', 0)}"
                f"; ls_rejected={metrics.get('local_search_rejected', 0)}"
                f"; ls_kicks={metrics.get('local_search_kicks', 0)}"
                f"; ls_post_kick_improvements={metrics.get('local_search_post_kick_improvements', 0)}"
                f"; ls_improvement_pct={metrics.get('local_search_improvement_pct', 0.0)}"
                f"; ls_termination={metrics.get('ls_termination_reason', 'NONE')}"
            )
        if "hard_restarts" in metrics:
            ls_part += (
                f"; hard_restarts={metrics.get('hard_restarts', 0)}"
                f"; cycle_scores={metrics.get('cycle_scores', '')}"
                f"; total_duration_ms={metrics.get('total_duration_ms', 0)}"
                f"; total_attempts={metrics.get('total_attempts', 0)}"
                f"; total_candidates={metrics.get('total_candidates', 0)}"
            )
        return (
            f"phase1 generated {len(solution.offers)} offers (DRAFT); "
            f"{len(diagnostics)} diagnostics; "
            f"quality_score={metrics.get('score', 0)}; "
            f"duration_ms={metrics.get('duration_ms', 0)}; "
            f"attempts={metrics.get('attempts', 1)}; "
            f"candidates={metrics.get('candidates_evaluated', 0)}; "
            f"backtracks={metrics.get('backtracks', 0)}; "
            f"room_gaps={metrics.get('room_gap_count', 0)}; "
            f"room_gap_minutes={metrics.get('room_gap_minutes', 0)}; "
            f"weekend_blocks={metrics.get('weekend_blocks', 0)}; "
            f"termination={metrics.get('termination_reason', 'UNKNOWN')}"
            f"{ls_part}"
        )
