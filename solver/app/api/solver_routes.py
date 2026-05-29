from __future__ import annotations

import asyncio
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.events import bus
from app.core.logging import get_logger
from app.infrastructure.persistence import (
    consume_generation_reservation,
    create_solver_run,
    get_solver_run,
)
from app.services.orchestrator import SolverOrchestrator, SolverRunRequest

router = APIRouter(prefix="/api/solver", tags=["solver"])
log = get_logger(__name__)

_orchestrator = SolverOrchestrator()


class RunRequestBody(BaseModel):
    academic_period_id: UUID
    run_type: Literal["TEACHER", "STUDENT"]
    student_id: UUID | None = None
    requested_by: UUID | None = None
    time_limit_ms: int = Field(default=30_000, ge=1_000, le=600_000)
    seed: int | None = None
    keep_existing_drafts: bool = False
    rate_limit_reservation_id: UUID | None = None
    classroom_ids: list[UUID] | None = None


class RunAcceptedResponse(BaseModel):
    solver_run_id: UUID
    status: str = "PENDING"
    websocket_url: str


class ConflictDTO(BaseModel):
    conflict_type: str
    message: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    course_id: UUID | None = None
    time_slot_id: UUID | None = None


class RunDetailResponse(BaseModel):
    solver_run_id: UUID
    run_type: str
    status: str
    teaching_schedule_id: UUID | None = None
    summary: str | None
    conflicts: list[ConflictDTO]


# --------------------------------------------------------------------------
# Async run trigger
# --------------------------------------------------------------------------
@router.post(
    "/run", response_model=RunAcceptedResponse, status_code=status.HTTP_202_ACCEPTED
)
async def trigger_run(
    body: RunRequestBody,
    x_solver_internal_token: str | None = Header(default=None),
) -> RunAcceptedResponse:
    _authorize_internal_request(x_solver_internal_token)
    if body.run_type == "TEACHER":
        if body.requested_by is None or body.rate_limit_reservation_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="generation reservation and requested_by are required",
            )
        reservation_ok = await run_in_threadpool(
            consume_generation_reservation,
            reservation_id=body.rate_limit_reservation_id,
            actor_id=body.requested_by,
            academic_period_id=body.academic_period_id,
        )
        if not reservation_ok:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="invalid or expired generation reservation",
            )

    run_id = await run_in_threadpool(
        create_solver_run,
        run_type=body.run_type,
        academic_period_id=body.academic_period_id,
        student_id=body.student_id,
        requested_by=body.requested_by,
        time_limit_ms=body.time_limit_ms,
        input_hash=None,
        seed=body.seed,
    )

    req = SolverRunRequest(
        academic_period_id=body.academic_period_id,
        run_type=body.run_type,
        student_id=body.student_id,
        requested_by=body.requested_by,
        time_limit_ms=body.time_limit_ms,
        seed=body.seed,
        keep_existing_drafts=body.keep_existing_drafts,
        rate_limit_reservation_id=None,
        classroom_ids=body.classroom_ids,
    )

    asyncio.create_task(_run_in_background(run_id, req))

    return RunAcceptedResponse(
        solver_run_id=run_id,
        websocket_url=f"/api/solver/ws/runs/{run_id}",
    )


async def _run_in_background(run_id: UUID, req: SolverRunRequest) -> None:
    try:
        await run_in_threadpool(_orchestrator.run_existing, run_id, req)
    except Exception:  
        log.exception("background solver run %s failed", run_id)


@router.get("/runs/{run_id}", response_model=RunDetailResponse)
async def get_run(run_id: UUID) -> RunDetailResponse:
    data = await run_in_threadpool(get_solver_run, run_id)
    if data is None:
        raise HTTPException(status_code=404, detail="solver_run not found")
    run = data["run"]
    conflicts = [
        ConflictDTO(
            conflict_type=c["conflict_type"],
            message=c["message"],
            resource_type=c["resource_type"],
            resource_id=c["resource_id"],
            course_id=c["course_id"],
            time_slot_id=c["time_slot_id"],
        )
        for c in data["conflicts"]
    ]
    return RunDetailResponse(
        solver_run_id=run["id"],
        run_type=run["run_type"],
        status=run["status"],
        teaching_schedule_id=run.get("teaching_schedule_id"),
        summary=run["result_summary"],
        conflicts=conflicts,
    )


def _authorize_internal_request(header_token: str | None) -> None:
    expected = get_settings().internal_token
    if not expected or header_token != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="invalid solver internal token",
        )


@router.websocket("/ws/runs/{run_id}")
async def ws_run_progress(websocket: WebSocket, run_id: UUID) -> None:
    await websocket.accept()
    topic = f"run:{run_id}"
    queue = await bus.subscribe(topic)
    try:
        snapshot = await run_in_threadpool(get_solver_run, run_id)
        if snapshot is not None:
            await websocket.send_json({
                "type": "snapshot",
                "run_id": str(run_id),
                "status": snapshot["run"]["status"],
                "summary": snapshot["run"]["result_summary"],
                "conflict_count": len(snapshot["conflicts"]),
            })

        while True:
            event = await queue.get()
            await websocket.send_json(event)
            if event.get("type") == "progress" and event.get("stage") == "finished":
                break
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("ws_run_progress failed")
    finally:
        await bus.unsubscribe(topic, queue)
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass


@router.websocket("/ws/inputs")
async def ws_inputs_changed(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = await bus.subscribe("inputs")
    sub_id = uuid4()
    try:
        await websocket.send_json({"type": "ready", "subscription_id": str(sub_id)})
        while True:
            event = await queue.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("ws_inputs_changed failed")
    finally:
        await bus.unsubscribe("inputs", queue)
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass
