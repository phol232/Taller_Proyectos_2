from __future__ import annotations

import json
from typing import Iterable
from uuid import UUID

from app.core.db import get_connection
from app.domain.models import (
    Conflict,
    CourseOffer,
    StudentScheduleItem,
    TeachingScheduleSolution,
)

def create_solver_run(
    *,
    run_type: str,
    academic_period_id: UUID,
    student_id: UUID | None,
    requested_by: UUID | None,
    time_limit_ms: int,
    input_hash: str | None,
    seed: int | None = None,
) -> UUID:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_create_run(%s, %s, %s, %s, %s, %s, %s) AS id",
            (run_type, academic_period_id, student_id, requested_by, time_limit_ms, input_hash, seed),
        )
        return cur.fetchone()["id"]

def finish_solver_run(
    run_id: UUID,
    *,
    status: str,
    summary: str,
    teaching_schedule_id: UUID | None = None,
) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_finish_run(%s, %s, %s, %s)",
            (run_id, status, summary, teaching_schedule_id),
        )

def set_solver_run_input_hash(run_id: UUID, digest: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_set_run_input_hash(%s, %s)",
            (run_id, digest),
        )

def report_conflicts(run_id: UUID, conflicts: Iterable[Conflict]) -> None:
    payload = [
        {
            "conflict_type": c.conflict_type.value,
            "resource_type": c.resource_type,
            "resource_id": str(c.resource_id) if c.resource_id else None,
            "course_id": str(c.course_id) if c.course_id else None,
            "time_slot_id": str(c.time_slot_id) if c.time_slot_id else None,
            "message": c.message,
            "details": c.details,
        }
        for c in conflicts
    ]
    if not payload:
        return
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_add_conflicts(%s, %s::jsonb)",
            (run_id, json.dumps(payload)),
        )

def persist_teaching_schedule(
    *,
    academic_period_id: UUID,
    created_by: UUID | None,
    solution: TeachingScheduleSolution,
    classroom_capacities: dict[UUID, int],
    keep_existing_drafts: bool = False,
) -> UUID:

    offers_payload = []
    for offer in solution.offers:
        capacity = classroom_capacities.get(offer.classroom_id, offer.max_capacity)
        offer.max_capacity = capacity
        offers_payload.append({
            "course_id": str(offer.course_id),
            "course_component_id": str(offer.course_component_id),
            "teacher_id": str(offer.teacher_id),
            "classroom_id": str(offer.classroom_id),
            "max_capacity": capacity,
            "section_number": offer.section_number,
            "blocks": [
                {
                    "time_slot_id": str(block.time_slot_id),
                    "start_time": block.start_time.strftime("%H:%M:%S"),
                    "end_time": block.end_time.strftime("%H:%M:%S"),
                }
                for block in offer.blocks
            ],
        })

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_persist_teaching_schedule(%s, %s, %s::jsonb, %s) AS id",
            (academic_period_id, created_by, json.dumps(offers_payload), keep_existing_drafts),
        )
        schedule_id: UUID = cur.fetchone()["id"]
        solution.teaching_schedule_id = schedule_id

        cur.execute(
            "SELECT * FROM fn_solver_list_offer_vacancies(%s)",
            (schedule_id,),
        )
        rows = cur.fetchall()

        index: dict[tuple, UUID] = {}
        index_section: dict[tuple, tuple] = {}  
        for r in rows:
            key = (r["course_component_id"], r["section_number"])
            index[key] = r["assignment_id"]
            index_section[key] = (r["section_id"], r["nrc"])
        for offer in solution.offers:
            key = (offer.course_component_id, offer.section_number)
            offer.assignment_id = index.get(key)
            sec = index_section.get(key)
            if sec:
                offer.section_id, offer.nrc = sec

        return schedule_id


def consume_generation_reservation(
    *,
    reservation_id: UUID,
    actor_id: UUID,
    academic_period_id: UUID,
) -> bool:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_consume_generation_reservation(%s, %s, %s) AS accepted",
            (reservation_id, actor_id, academic_period_id),
        )
        row = cur.fetchone()
        return bool(row and row["accepted"])

def persist_student_schedule(
    *,
    student_id: UUID,
    academic_period_id: UUID,
    generated_by: UUID | None,
    items: list[StudentScheduleItem],
) -> UUID:
    payload = [
        {
            "course_id": str(item.course_id),
            "components": [
                {
                    "course_component_id": str(component_id),
                    "course_assignment_id": str(assignment_id),
                }
                for component_id, assignment_id in item.component_assignments
            ],
        }
        for item in items
    ]
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT fn_solver_persist_student_schedule(%s, %s, %s, %s::jsonb) AS id",
            (student_id, academic_period_id, generated_by, json.dumps(payload)),
        )
        return cur.fetchone()["id"]

class NoVacancyError(Exception):
    """Raised when a draft option cannot be held due to lack of vacancy."""

    def __init__(self, course_id: str | None = None):
        self.course_id = course_id
        super().__init__(f"no vacancy to hold seats for course {course_id}")


def save_student_draft_option(
    *,
    student_id: UUID,
    academic_period_id: UUID,
    generated_by: UUID | None,
    items: list[StudentScheduleItem],
    ttl_seconds: int,
    max_live_drafts: int,
) -> UUID:
    """Persist one DRAFT option and reserve its seats (seat_holds).

    Raises NoVacancyError if any component has no vacancy (the DB function
    raises SQLSTATE P0001 and rolls back the whole option).
    """
    payload = [
        {
            "course_id": str(item.course_id),
            "components": [
                {
                    "course_component_id": str(component_id),
                    "course_assignment_id": str(assignment_id),
                }
                for component_id, assignment_id in item.component_assignments
            ],
        }
        for item in items
    ]
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT fn_student_save_draft_option(%s, %s, %s, %s::jsonb, %s, %s) AS id",
                (student_id, academic_period_id, generated_by,
                 json.dumps(payload), ttl_seconds, max_live_drafts),
            )
            return cur.fetchone()["id"]
    except Exception as exc:  # noqa: BLE001
        sqlstate = getattr(exc, "sqlstate", None) or getattr(
            getattr(exc, "diag", None), "sqlstate", None
        )
        if sqlstate == "P0001":
            course_id = None
            msg = str(exc)
            if "SIN_CUPO:" in msg:
                course_id = msg.split("SIN_CUPO:", 1)[1].strip().split()[0]
            raise NoVacancyError(course_id) from exc
        raise


def load_student_live_assignments(
    academic_period_id: UUID, student_ids: list[UUID]
) -> dict[UUID, frozenset[UUID]]:
    """student_id -> assignment_ids reservadas en borradores vivos."""
    out: dict[UUID, set[UUID]] = {}
    if not student_ids:
        return {}
    with get_connection() as conn, conn.cursor() as cur:
        for sid in student_ids:
            cur.execute(
                "SELECT course_assignment_id FROM fn_student_live_assignment_ids(%s, %s)",
                (sid, academic_period_id),
            )
            ids = {r["course_assignment_id"] for r in cur.fetchall()}
            if ids:
                out[sid] = ids
    return {sid: frozenset(ids) for sid, ids in out.items()}


def load_offer_vacancies(teaching_schedule_id: UUID) -> dict[UUID, dict]:
    """Returns assignment_id -> dict(course_id, teacher_id, classroom_id,
    max_capacity, enrolled_count, time_slot_ids)."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM fn_solver_list_offer_vacancies(%s)",
            (teaching_schedule_id,),
        )
        out: dict[UUID, dict] = {}
        for r in cur.fetchall():
            out[r["assignment_id"]] = {
                "course_id": r["course_id"],
                "course_component_id": r["course_component_id"],
                "teacher_id": r["teacher_id"],
                "classroom_id": r["classroom_id"],
                "max_capacity": r["max_capacity"],
                "enrolled_count": r["enrolled_count"],
                "time_slot_ids": list(r["time_slot_ids"]),
                "slot_start_times": list(r.get("slot_start_times") or []),
                "slot_end_times": list(r.get("slot_end_times") or []),
            }
        return out

def get_solver_run(run_id: UUID) -> dict | None:
    """Fetch a solver run + its conflicts. Reads via fn_solver_* functions."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM fn_solver_get_run(%s)",
            (run_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        cur.execute(
            "SELECT * FROM fn_solver_list_run_conflicts(%s)",
            (run_id,),
        )
        conflicts = cur.fetchall()
        return {"run": row, "conflicts": conflicts}
