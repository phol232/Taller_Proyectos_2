"""TravelTimeChecker — H9 (teacher) and H15 (student)."""
from __future__ import annotations

from datetime import datetime, time
from uuid import UUID

from app.domain.models import TimeSlot


def _to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


class TravelTimeChecker:
    def __init__(self, travel_times: dict[str, dict[str, int]]):
        self._travel = travel_times

    def minutes_between(self, slot_a: TimeSlot, slot_b: TimeSlot) -> int | None:
        """Free minutes between two slots on the same day, or None if not the same day."""
        if slot_a.day_of_week != slot_b.day_of_week:
            return None
        first, second = sorted((slot_a, slot_b), key=lambda s: s.slot_order)
        return _to_minutes(second.start_time) - _to_minutes(first.end_time)

    def required_minutes(self, building_a: str | None, building_b: str | None) -> int:
        if not building_a or not building_b or building_a == building_b:
            return 0
        return self._travel.get(building_a, {}).get(building_b, 0)

    def is_feasible(
        self,
        slot_a: TimeSlot,
        building_a: str | None,
        slot_b: TimeSlot,
        building_b: str | None,
    ) -> bool:
        gap = self.minutes_between(slot_a, slot_b)
        if gap is None:
            return True  
        if gap < 0:
            return False  
        return gap >= self.required_minutes(building_a, building_b)
