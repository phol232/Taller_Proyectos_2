"""FastAPI entrypoint."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.solver_routes import router as solver_router
from app.core.db import close_pool, get_pool
from app.core.events import bus
from app.core.logging import configure_logging, get_logger
from app.infrastructure.pg_listener import listen_forever

configure_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("solver microservice starting")
    get_pool()
    bus.bind_loop(asyncio.get_running_loop())

    stop_event = asyncio.Event()
    listener_task = asyncio.create_task(listen_forever(stop_event))
    try:
        yield
    finally:
        log.info("solver microservice shutting down")
        stop_event.set()
        listener_task.cancel()
        try:
            await listener_task
        except (asyncio.CancelledError, Exception):  # noqa: BLE001
            pass
        close_pool()


app = FastAPI(
    title="Planner UC — Solver CSP Microservice",
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(solver_router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
