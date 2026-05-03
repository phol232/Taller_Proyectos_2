"""VacancyTracker — in-memory counter of free seats per offer (H12)."""
from __future__ import annotations

from collections import defaultdict
from uuid import UUID


class VacancyTracker:
    def __init__(self, offers: dict[UUID, dict]):
        """offers: assignment_id -> dict (must include max_capacity, enrolled_count, course_id)."""
        self._free: dict[UUID, int] = {
            aid: int(meta["max_capacity"]) - int(meta["enrolled_count"])
            for aid, meta in offers.items()
        }
        
        self._by_course: dict[UUID, list[UUID]] = defaultdict(list)
        self._by_component: dict[UUID, list[UUID]] = defaultdict(list)
        for aid, meta in offers.items():
            self._by_course[meta["course_id"]].append(aid)
            if "course_component_id" in meta:
                self._by_component[meta["course_component_id"]].append(aid)

    def offers_for_course(self, course_id: UUID) -> list[UUID]:
        return list(self._by_course.get(course_id, []))

    def offers_for_component(self, component_id: UUID) -> list[UUID]:
        return list(self._by_component.get(component_id, []))

    def free(self, assignment_id: UUID) -> int:
        return self._free.get(assignment_id, 0)

    def has_vacancy(self, assignment_id: UUID) -> bool:
        return self._free.get(assignment_id, 0) > 0

    def reserve(self, assignment_id: UUID) -> bool:
        if not self.has_vacancy(assignment_id):
            return False
        self._free[assignment_id] -= 1
        return True

    def release(self, assignment_id: UUID) -> None:
        if assignment_id in self._free:
            self._free[assignment_id] += 1
