"""Redis cache helpers for solver-derived structures.

Fallback silencioso: si Redis no esta disponible o esta deshabilitado, las
funciones devuelven None en get y son no-op en set. El solver sigue
funcionando sin cache.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings

_logger = logging.getLogger(__name__)

_client = None
_initialized = False


def _get_client():
    global _client, _initialized
    if _initialized:
        return _client
    _initialized = True
    settings = get_settings()
    if not settings.redis_enabled:
        return None
    try:
        import redis  # type: ignore

        _client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
        _client.ping()
        _logger.info("Redis cache enabled at %s:%s", settings.redis_host, settings.redis_port)
    except Exception as exc:
        _logger.warning("Redis cache disabled (fallback): %s", exc)
        _client = None
    return _client


def get_json(key: str) -> Any | None:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        _logger.warning("cache get failed for %s: %s", key, exc)
        return None


def set_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        ttl = ttl_seconds if ttl_seconds is not None else get_settings().redis_cache_ttl_seconds
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        _logger.warning("cache set failed for %s: %s", key, exc)


def invalidate_pattern(pattern: str) -> int:
    client = _get_client()
    if client is None:
        return 0
    try:
        count = 0
        for key in client.scan_iter(pattern):
            client.delete(key)
            count += 1
        return count
    except Exception as exc:
        _logger.warning("cache invalidate failed for %s: %s", pattern, exc)
        return 0
