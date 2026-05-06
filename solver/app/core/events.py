from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any


class EventBus:
    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)

    # ---- lifecycle ----
    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    # ---- subscription (async side) ----
    async def subscribe(self, topic: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=256)
        self._subscribers[topic].add(q)
        return q

    async def unsubscribe(self, topic: str, q: asyncio.Queue) -> None:
        self._subscribers.get(topic, set()).discard(q)

    # ---- publishing ----
    def publish(self, topic: str, event: dict[str, Any]) -> None:
        """Thread-safe publish. Safe to call from worker threads."""
        if self._loop is None or self._loop.is_closed():
            return
        self._loop.call_soon_threadsafe(self._dispatch, topic, event)

    def _dispatch(self, topic: str, event: dict[str, Any]) -> None:
        for q in list(self._subscribers.get(topic, set())):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # drop the slowest subscriber's oldest item to keep moving
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except Exception:  # noqa: BLE001
                    pass


bus = EventBus()
