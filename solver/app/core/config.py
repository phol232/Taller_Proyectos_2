"""Configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOLVER_", env_file=ENV_FILE, extra="ignore")

    db_dsn: str = Field(default="postgresql://horarios:horarios@localhost:5432/horarios_db")
    db_pool_min: int = Field(default=1)
    db_pool_max: int = Field(default=8)

    default_time_limit_ms: int = Field(default=30_000)
    log_level: str = Field(default="INFO")
    internal_token: str = Field(default="")

    # Default shift definitions (24h clock).
    shift_morning_start: str = Field(default="06:00")
    shift_morning_end: str = Field(default="13:00")
    shift_afternoon_start: str = Field(default="13:00")
    shift_afternoon_end: str = Field(default="19:00")
    shift_evening_start: str = Field(default="19:00")
    shift_evening_end: str = Field(default="22:10")


@lru_cache
def get_settings() -> Settings:
    return Settings()
