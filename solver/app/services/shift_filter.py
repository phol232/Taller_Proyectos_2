"""ShiftFilter — H13: only assign offers whose slots fall within the student's shift."""
from __future__ import annotations

from datetime import time
from typing import Iterable
from uuid import UUID

from app.core.config import get_settings
from app.domain.models import Shift, TimeSlot


def _parse(t: str) -> time:
    h, m = t.split(":")
    return time(int(h), int(m))


class ShiftFilter:
    def __init__(self) -> None:
        s = get_settings()
        self._ranges: dict[Shift, tuple[time, time]] = {
            Shift.MORNING: (_parse(s.shift_morning_start), _parse(s.shift_morning_end)),
            Shift.AFTERNOON: (_parse(s.shift_afternoon_start), _parse(s.shift_afternoon_end)),
            Shift.EVENING: (_parse(s.shift_evening_start), _parse(s.shift_evening_end)),
        }
        self._adjacent: dict[Shift, list[Shift]] = {
            Shift.MORNING: [Shift.AFTERNOON],
            Shift.AFTERNOON: [Shift.MORNING, Shift.EVENING],
            Shift.EVENING: [Shift.AFTERNOON],
            Shift.FLEXIBLE: [],
        }

    def slot_in_shift(self, slot: TimeSlot, shift: Shift) -> bool:
        if shift == Shift.FLEXIBLE:
            return True
        start, end = self._ranges[shift]
        return slot.start_time >= start and slot.end_time <= end

    def slot_in_any_shift(self, slot: TimeSlot, shifts: frozenset[Shift]) -> bool:
        if not shifts or Shift.FLEXIBLE in shifts:
            return True
        return any(self.slot_in_shift(slot, sh) for sh in shifts)

    def all_slots_in_shift(
        self, slot_ids: Iterable[UUID], slots: dict[UUID, TimeSlot], shift: Shift
    ) -> bool:
        return all(self.slot_in_shift(slots[sid], shift) for sid in slot_ids if sid in slots)

    def adjacent_shifts(self, shift: Shift) -> list[Shift]:
        return self._adjacent.get(shift, [])
