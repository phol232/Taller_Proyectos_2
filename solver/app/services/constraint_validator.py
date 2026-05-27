"""ConstraintValidator — final hard-constraint cross-check before persistence."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, time
from uuid import UUID

from app.domain.models import (
    Conflict,
    ConflictType,
    CourseOffer,
    DayOfWeek,
    ScheduledBlock,
    TimeSlot,
)
from app.domain.solver_input import SolverInput
from app.services.travel_time import TravelTimeChecker


_DAY_ORDER: dict[DayOfWeek, int] = {
    DayOfWeek.MONDAY: 0,
    DayOfWeek.TUESDAY: 1,
    DayOfWeek.WEDNESDAY: 2,
    DayOfWeek.THURSDAY: 3,
    DayOfWeek.FRIDAY: 4,
    DayOfWeek.SATURDAY: 5,
    DayOfWeek.SUNDAY: 6,
}

_LUNCH_START = time(13, 30)
_LUNCH_END = time(14, 0)
_MIN_REST_MINUTES = 1


class ConstraintValidator:
    """Validates a Phase 1 solution against H1–H9. Returns the list of violations."""

    def __init__(self, data: SolverInput):
        self._data = data
        self._travel = TravelTimeChecker(data.travel_times)

    def validate_offers(self, offers: list[CourseOffer]) -> list[Conflict]:
        conflicts: list[Conflict] = []
        teacher_blocks: dict[tuple[UUID, object], list[ScheduledBlock]] = defaultdict(list)
        classroom_blocks: dict[tuple[UUID, object], list[ScheduledBlock]] = defaultdict(list)

        for offer in offers:
            course = self._data.courses.get(offer.course_id)
            component = self._data.course_components.get(offer.course_component_id)
            classroom = self._data.classrooms.get(offer.classroom_id)
            if course is None or component is None or classroom is None:
                conflicts.append(
                    Conflict(
                        ConflictType.INTERNAL_ERROR,
                        f"Unknown course/classroom in offer {offer.course_id}",
                        course_id=offer.course_id,
                    )
                )
                continue

            component_classrooms = self._data.classroom_course_components.get(offer.course_component_id)
            if component_classrooms and offer.classroom_id not in component_classrooms:
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "classroom not authorised for course component",
                    resource_type="classroom", resource_id=offer.classroom_id))
            course_classrooms = self._data.classroom_courses.get(offer.course_id, set())
            if (
                not component_classrooms
                and course_classrooms
                and offer.classroom_id not in course_classrooms
            ):
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "classroom not authorised for course",
                    resource_type="classroom", resource_id=offer.classroom_id))
            if classroom.room_type != component.required_room_type:
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "classroom room_type mismatch"))

            if offer.teacher_id not in self._data.teacher_course_components.get(offer.course_component_id, set()):
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "teacher cannot teach this course",
                    resource_type="teacher", resource_id=offer.teacher_id))

            offer_blocks = self._blocks_for_offer(offer)
            invalid_block = next(
                (
                    block for block in offer_blocks
                    if self._duration_hours(block.start_time, block.end_time) != 1.5
                ),
                None,
            )
            if invalid_block is not None:
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "class block must be exactly 1.5h", time_slot_id=invalid_block.time_slot_id))
            duration_hours = sum(
                self._duration_hours(block.start_time, block.end_time)
                for block in offer_blocks
            )
            if abs(duration_hours - float(component.weekly_hours)) > 1e-6:
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    f"expected duration {component.weekly_hours}h, got {duration_hours}h"))
            if not self._is_compact_single_day_group(offer_blocks):
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "component blocks must be consecutive on the same day"))

            if classroom.capacity <= 0:
                conflicts.append(self._mk(
                    ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                    "classroom has zero capacity"))

            for block in offer_blocks:
                slot = self._data.time_slots.get(block.time_slot_id)
                if slot is None:
                    conflicts.append(self._mk(
                        ConflictType.INTERNAL_ERROR, offer.course_id,
                        f"unknown time_slot {block.time_slot_id}", time_slot_id=block.time_slot_id))
                    continue

                if (
                    slot.day_of_week != block.day
                    or slot.start_time != block.start_time
                    or slot.end_time != block.end_time
                ):
                    conflicts.append(self._mk(
                        ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                        "offer block does not match persisted time_slot", time_slot_id=slot.id))

                if not self._block_in_availability(offer.teacher_id, block, self._data.teacher_availability):
                    conflicts.append(self._mk(
                        ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                        "teacher not available", time_slot_id=block.time_slot_id,
                        resource_type="teacher", resource_id=offer.teacher_id))
                if not self._block_in_availability(offer.classroom_id, block, self._data.classroom_availability):
                    conflicts.append(self._mk(
                        ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                        "classroom not available", time_slot_id=block.time_slot_id,
                        resource_type="classroom", resource_id=offer.classroom_id))

            for block in offer_blocks:
                tkey = (offer.teacher_id, block.day)
                for placed in teacher_blocks[tkey]:
                    if self._overlaps_blocks(block, placed):
                        conflicts.append(self._mk(
                            ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                            "teacher double booked", time_slot_id=block.time_slot_id,
                            resource_type="teacher", resource_id=offer.teacher_id))
                        break
                teacher_blocks[tkey].append(block)

                ckey = (offer.classroom_id, block.day)
                for placed in classroom_blocks[ckey]:
                    if self._overlaps_blocks(block, placed):
                        conflicts.append(self._mk(
                            ConflictType.NO_ASSIGNMENT_POSSIBLE, offer.course_id,
                            "classroom double booked", time_slot_id=block.time_slot_id,
                            resource_type="classroom", resource_id=offer.classroom_id))
                        break
                classroom_blocks[ckey].append(block)

        conflicts += self._check_travel(offers)
        conflicts += self._check_theory_before_practice(offers)
        conflicts += self._check_section_no_overlap(offers)
        conflicts += self._check_lunch_window(offers)
        conflicts += self._check_capacity(offers)
        conflicts += self._check_teacher_rest(offers)
        return conflicts

    def _check_theory_before_practice(self, offers: list[CourseOffer]) -> list[Conflict]:
        theory_end: dict[UUID, tuple[int, time]] = {}
        practice_start: dict[UUID, tuple[int, time, UUID | None]] = {}

        for offer in offers:
            component = self._data.course_components.get(offer.course_component_id)
            if component is None:
                continue
            ctype = component.component_type.upper()
            for block in self._blocks_for_offer(offer):
                day_idx = _DAY_ORDER.get(block.day, 9)
                end_key = (day_idx, block.end_time)
                start_key = (day_idx, block.start_time, block.time_slot_id)
                if ctype == "THEORY":
                    cur = theory_end.get(offer.course_id)
                    if cur is None or end_key > cur:
                        theory_end[offer.course_id] = end_key
                elif ctype in ("PRACTICE", "GENERAL"):
                    cur = practice_start.get(offer.course_id)
                    if cur is None or (start_key[0], start_key[1]) < (cur[0], cur[1]):
                        practice_start[offer.course_id] = start_key

        conflicts: list[Conflict] = []
        for course_id, (p_day, p_start, slot_id) in practice_start.items():
            t_end = theory_end.get(course_id)
            if t_end is None:
                conflicts.append(self._mk(
                    ConflictType.THEORY_AFTER_PRACTICE, course_id,
                    "practice scheduled but no theory exists for this course",
                    time_slot_id=slot_id))
                continue
            if (p_day, p_start) < t_end:
                conflicts.append(self._mk(
                    ConflictType.THEORY_AFTER_PRACTICE, course_id,
                    f"practice starts before theory ends "
                    f"(practice day={p_day} {p_start}, theory ends day={t_end[0]} {t_end[1]})",
                    time_slot_id=slot_id))
        return conflicts

    def _check_section_no_overlap(self, offers: list[CourseOffer]) -> list[Conflict]:
        by_section: dict[tuple[UUID, int], list[tuple[ScheduledBlock, CourseOffer]]] = defaultdict(list)
        for offer in offers:
            for block in self._blocks_for_offer(offer):
                by_section[(offer.course_id, offer.section_number)].append((block, offer))

        conflicts: list[Conflict] = []
        for (course_id, section_no), items in by_section.items():
            items.sort(key=lambda it: (_DAY_ORDER.get(it[0].day, 9), it[0].start_time))
            for (a, oa), (b, ob) in zip(items, items[1:]):
                if oa.course_component_id == ob.course_component_id:
                    continue
                if self._overlaps_blocks(a, b):
                    conflicts.append(self._mk(
                        ConflictType.SECTION_OVERLAP, course_id,
                        f"section {section_no} has overlapping classes "
                        f"({oa.course_component_id} vs {ob.course_component_id})",
                        time_slot_id=b.time_slot_id))
        return conflicts

    def _check_lunch_window(self, offers: list[CourseOffer]) -> list[Conflict]:
        conflicts: list[Conflict] = []
        for offer in offers:
            for block in self._blocks_for_offer(offer):
                if block.start_time < _LUNCH_END and block.end_time > _LUNCH_START:
                    conflicts.append(self._mk(
                        ConflictType.LUNCH_VIOLATION, offer.course_id,
                        f"class overlaps lunch window {_LUNCH_START}-{_LUNCH_END}",
                        time_slot_id=block.time_slot_id))
        return conflicts

    def _check_capacity(self, offers: list[CourseOffer]) -> list[Conflict]:
        conflicts: list[Conflict] = []
        for offer in offers:
            classroom = self._data.classrooms.get(offer.classroom_id)
            if classroom is None:
                continue
            if offer.max_capacity > 0 and classroom.capacity < offer.max_capacity:
                conflicts.append(self._mk(
                    ConflictType.CAPACITY_EXCEEDED, offer.course_id,
                    f"classroom capacity {classroom.capacity} < section size {offer.max_capacity}",
                    resource_type="classroom", resource_id=offer.classroom_id))
        return conflicts

    def _check_teacher_rest(self, offers: list[CourseOffer]) -> list[Conflict]:
        per_teacher_day: dict[tuple[UUID, DayOfWeek], list[ScheduledBlock]] = defaultdict(list)
        for offer in offers:
            for block in self._blocks_for_offer(offer):
                per_teacher_day[(offer.teacher_id, block.day)].append(block)

        conflicts: list[Conflict] = []
        for (teacher_id, day), blocks in per_teacher_day.items():
            blocks.sort(key=lambda b: b.start_time)
            for prev, nxt in zip(blocks, blocks[1:]):
                if prev.end_time >= nxt.start_time:
                    continue
                gap = (nxt.start_time.hour * 60 + nxt.start_time.minute) - (
                    prev.end_time.hour * 60 + prev.end_time.minute
                )
                if gap < _MIN_REST_MINUTES:
                    conflicts.append(Conflict(
                        ConflictType.INSUFFICIENT_REST,
                        f"teacher {teacher_id} has {gap}min rest on {day} "
                        f"(min {_MIN_REST_MINUTES}min required)",
                        resource_type="teacher", resource_id=teacher_id,
                        time_slot_id=nxt.time_slot_id))
        return conflicts

    def _check_travel(self, offers: list[CourseOffer]) -> list[Conflict]:

        per_teacher: dict[UUID, list[tuple[TimeSlot, CourseOffer]]] = defaultdict(list)
        for offer in offers:
            for sid in offer.time_slot_ids:
                slot = self._data.time_slots.get(sid)
                if slot:
                    per_teacher[offer.teacher_id].append((slot, offer))

        conflicts: list[Conflict] = []
        for teacher_id, items in per_teacher.items():
            items.sort(key=lambda it: (it[0].day_of_week.value, it[0].start_time))
            for (a, oa), (b, ob) in zip(items, items[1:]):
                if a.day_of_week != b.day_of_week:
                    continue
                ba = self._data.classrooms[oa.classroom_id].building_code
                bb = self._data.classrooms[ob.classroom_id].building_code
                if not self._travel.is_feasible(a, ba, b, bb):
                    conflicts.append(Conflict(
                        ConflictType.TRAVEL_TIME_VIOLATION,
                        f"teacher {teacher_id} cannot travel between {ba} and {bb} in time",
                        resource_type="teacher", resource_id=teacher_id,
                        time_slot_id=b.id,
                    ))
        return conflicts

    @staticmethod
    def _mk(ct: ConflictType, course_id: UUID, msg: str, **kw) -> Conflict:
        return Conflict(conflict_type=ct, message=msg, course_id=course_id, **kw)

    @staticmethod
    def _duration_hours(start: time, end: time) -> float:
        start_minutes = start.hour * 60 + start.minute
        end_minutes = end.hour * 60 + end.minute
        return (end_minutes - start_minutes) / 60

    @staticmethod
    def _overlaps_offer(a: CourseOffer, b: CourseOffer) -> bool:
        return a.start_time < b.end_time and b.start_time < a.end_time

    @staticmethod
    def _overlaps_blocks(a: ScheduledBlock, b: ScheduledBlock) -> bool:
        return a.day == b.day and a.start_time < b.end_time and b.start_time < a.end_time

    def _overlaps_block(self, block, offer: CourseOffer) -> bool:
        return any(
            block.day == placed.day
            and block.start_time < placed.end_time
            and placed.start_time < block.end_time
            for placed in self._blocks_for_offer(offer)
        )

    def _block_in_availability(self, entity_id: UUID, block, availability: dict) -> bool:
        slot_ids = availability.get(entity_id, set())
        if not slot_ids:
            return True
        for sid in slot_ids:
            slot = self._data.time_slots.get(sid)
            if slot is None or slot.day_of_week != block.day:
                continue
            if slot.start_time <= block.start_time and block.end_time <= slot.end_time:
                return True
        return False

    def _blocks_for_offer(self, offer: CourseOffer):
        if offer.blocks:
            return offer.blocks
        blocks = []
        for sid in offer.time_slot_ids:
            slot = self._data.time_slots.get(sid)
            if slot is None:
                continue
            blocks.append(
                ScheduledBlock(
                    time_slot_id=sid,
                    day=slot.day_of_week,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    slot_order=slot.slot_order,
                )
            )
        return blocks

    @staticmethod
    def _is_compact_single_day_group(blocks) -> bool:
        if len(blocks) <= 1:
            return True
        ordered = sorted(blocks, key=lambda block: (block.day.value, block.start_time))
        day = ordered[0].day
        if any(block.day != day for block in ordered):
            return False

        for prev, nxt in zip(ordered, ordered[1:]):
            gap_minutes = (
                nxt.start_time.hour * 60 + nxt.start_time.minute
                - prev.end_time.hour * 60 - prev.end_time.minute
            )
            if prev.end_time == time(13, 30):
                if gap_minutes != 30:
                    return False
            elif gap_minutes != 10:
                return False
        return True
