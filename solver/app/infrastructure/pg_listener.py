"""Async PostgreSQL LISTEN task.

Subscribes to channels emitted by DB triggers (see
`database/triggers/solver_notify.sql`) and rebroadcasts them on the
in-process EventBus under topic ``inputs``.

Channels:
- ``solver_inputs_changed``  — payload is the table name that changed.
"""
from __future__ import annotations

import asyncio

import psycopg

from app.core.config import get_settings
from app.core.events import bus
from app.core.logging import get_logger

log = get_logger(__name__)

CHANNEL = "solver_inputs_changed"


async def listen_forever(stop: asyncio.Event) -> None:
    settings = get_settings()
    backoff = 1.0
    while not stop.is_set():
        try:
            async with await psycopg.AsyncConnection.connect(
                settings.db_dsn, autocommit=True
            ) as aconn:
                async with aconn.cursor() as cur:
                    await cur.execute(f"LISTEN {CHANNEL}")
                log.info("pg listener subscribed to %s", CHANNEL)
                backoff = 1.0
                gen = aconn.notifies()
                async for notify in gen:
                    if stop.is_set():
                        break
                    bus.publish(
                        "inputs",
                        {
                            "type": "inputs_changed",
                            "channel": notify.channel,
                            "payload": notify.payload,
                        },
                    )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("pg listener error: %s; reconnecting in %.1fs", exc, backoff)
            try:
                await asyncio.wait_for(stop.wait(), timeout=backoff)
            except asyncio.TimeoutError:
                pass
            backoff = min(backoff * 2, 30.0)
