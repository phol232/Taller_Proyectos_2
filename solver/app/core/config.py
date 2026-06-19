"""Configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOLVER_", env_file=ENV_FILE, extra="ignore")

    db_dsn: str = Field(..., description="DSN de PostgreSQL. Ejemplo: postgresql://user:pass@host:port/db")
    db_pool_min: int = Field(default=1)
    db_pool_max: int = Field(default=8)

    default_time_limit_ms: int = Field(default=30_000)
    log_level: str = Field(default="INFO")
    internal_token: str = Field(default="")

    shift_morning_start: str = Field(default="07:00")
    shift_morning_end: str = Field(default="12:00")
    shift_afternoon_start: str = Field(default="12:00")
    shift_afternoon_end: str = Field(default="19:00")
    shift_evening_start: str = Field(default="19:00")
    shift_evening_end: str = Field(default="22:10")

    local_search_ratio: float = Field(default=0.45)

    local_search_max_iters: int = Field(default=10_000)

    local_search_patience: int = Field(default=400)

    local_search_min_budget_ms: int = Field(default=1_500)

    local_search_max_kicks: int = Field(default=6)

    local_search_max_hard_restarts: int = Field(default=3)
    local_search_hard_restart_min_budget_ms: int = Field(default=8_000)
    local_search_hard_restart_first_ratio: float = Field(default=0.55)

    # Paralelismo de la Fase 1: portafolio de ciclos en procesos (fork + COW).
    parallel_enabled: bool = Field(default=False)
    parallel_workers: int = Field(default=2)
    parallel_cycles: int = Field(default=2)
    parallel_time_factor: float = Field(default=0.6)

    redis_enabled: bool = Field(default=False)
    redis_host: str = Field(default="redis")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)
    redis_cache_ttl_seconds: int = Field(default=86_400)


@lru_cache
def get_settings() -> Settings:
    return Settings()
