"""ConflictReporter — buffered list of conflicts."""
from __future__ import annotations

from app.domain.models import Conflict


class ConflictReporter:
    def __init__(self) -> None:
        self._items: list[Conflict] = []

    def add(self, conflict: Conflict) -> None:
        self._items.append(conflict)

    def extend(self, conflicts: list[Conflict]) -> None:
        self._items.extend(conflicts)

    @property
    def items(self) -> list[Conflict]:
        return list(self._items)

    def has_conflicts(self) -> bool:
        return bool(self._items)
