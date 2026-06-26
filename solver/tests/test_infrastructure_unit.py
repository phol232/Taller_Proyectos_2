"""Unit tests for small infrastructure and API modules."""
from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.core.events import EventBus
from app.domain.models import Conflict, ConflictType
from app.services.conflict_reporter import ConflictReporter


def test_conflict_reporter_collects_items():
    reporter = ConflictReporter()
    conflict = Conflict(ConflictType.SECTION_OVERLAP, "overlap")

    reporter.add(conflict)
    reporter.extend([Conflict(ConflictType.NO_VACANCY, "room")])

    assert reporter.has_conflicts() is True
    assert len(reporter.items) == 2
    assert reporter.items[0].message == "overlap"


@pytest.mark.asyncio
async def test_event_bus_publish_dispatches_to_subscriber():
    bus = EventBus()
    loop = asyncio.get_running_loop()
    bus.bind_loop(loop)

    queue = await bus.subscribe("run:123")
    bus.publish("run:123", {"type": "progress", "stage": "started"})

    await asyncio.sleep(0)
    event = queue.get_nowait()
    assert event["stage"] == "started"


def test_event_bus_publish_ignored_without_loop():
    bus = EventBus()
    bus.publish("run:missing", {"type": "progress"})
    # No exception means safe no-op when loop is not bound.


def test_healthz_endpoint(monkeypatch):
    monkeypatch.setattr("app.main.get_pool", lambda: object())
    monkeypatch.setattr(
        "app.main.listen_forever",
        lambda stop_event: asyncio.sleep(0),
    )

    from app.main import app

    with TestClient(app) as client:
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
