from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time
from enum import Enum
from typing import Iterable
from uuid import UUID


class DayOfWeek(str, Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class Shift(str, Enum):
    MORNING = "MORNING"
    AFTERNOON = "AFTERNOON"
    EVENING = "EVENING"
    FLEXIBLE = "FLEXIBLE"


@dataclass(frozen=True)
class TimeSlot:
    id: UUID
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    slot_order: int


@dataclass(frozen=True)
class ScheduledBlock:
    time_slot_id: UUID
    day: DayOfWeek
    start_time: time
    end_time: time
    slot_order: int


@dataclass(frozen=True)
class Course:
    id: UUID
    code: str
    name: str
    cycle: int
    credits: int
    required_credits: int
    weekly_hours: float
    required_room_type: str


@dataclass(frozen=True)
class CourseComponent:
    id: UUID
    course_id: UUID
    component_type: str
    weekly_hours: float
    required_room_type: str
    sort_order: int


@dataclass(frozen=True)
class Teacher:
    id: UUID
    code: str
    full_name: str


@dataclass(frozen=True)
class Classroom:
    id: UUID
    code: str
    name: str
    capacity: int
    room_type: str
    building_code: str | None


@dataclass(frozen=True)
class Student:
    id: UUID
    code: str
    full_name: str
    cycle: int
    credit_limit: int
    gpa: float | None
    preferred_shift: Shift | None
    completed_course_ids: frozenset[UUID]


# ---------- Solver outputs ----------

@dataclass(init=False)
class CourseOffer:
    course_id: UUID
    course_component_id: UUID
    teacher_id: UUID
    classroom_id: UUID
    day: DayOfWeek | None
    start_time: time | None
    end_time: time | None
    availability_slot_id: UUID | None
    max_capacity: int
    section_number: int
    assignment_id: UUID | None
    section_id: UUID | None
    nrc: str | None
    blocks: list[ScheduledBlock]
    _legacy_time_slot_ids: list[UUID]

    def __init__(
        self,
        *,
        course_id: UUID,
        course_component_id: UUID,
        teacher_id: UUID,
        classroom_id: UUID,
        max_capacity: int,
        day: DayOfWeek | None = None,
        start_time: time | None = None,
        end_time: time | None = None,
        availability_slot_id: UUID | None = None,
        section_number: int = 1,
        assignment_id: UUID | None = None,
        section_id: UUID | None = None,
        nrc: str | None = None,
        blocks: list[ScheduledBlock] | None = None,
        time_slot_ids: list[UUID] | None = None,
    ) -> None:
        self.course_id = course_id
        self.course_component_id = course_component_id
        self.teacher_id = teacher_id
        self.classroom_id = classroom_id
        self.day = day
        self.start_time = start_time
        self.end_time = end_time
        self.availability_slot_id = availability_slot_id
        self.max_capacity = max_capacity
        self.section_number = section_number
        self.assignment_id = assignment_id
        self.section_id = section_id
        self.nrc = nrc
        self.blocks = list(blocks or [])
        self._legacy_time_slot_ids = list(time_slot_ids or [])
        if not self.blocks and availability_slot_id and day and start_time and end_time:
            self.blocks = [
                ScheduledBlock(
                    time_slot_id=availability_slot_id,
                    day=day,
                    start_time=start_time,
                    end_time=end_time,
                    slot_order=0,
                )
            ]

    @property
    def time_slot_ids(self) -> list[UUID]:
        if self.blocks:
            return [block.time_slot_id for block in self.blocks]
        return list(self._legacy_time_slot_ids)


@dataclass
class TeachingScheduleSolution:
    teaching_schedule_id: UUID | None = None
    offers: list[CourseOffer] = field(default_factory=list)


@dataclass
class StudentScheduleItem:
    course_id: UUID
    component_assignments: list[tuple[UUID, UUID]]


@dataclass
class StudentScheduleSolution:
    student_id: UUID
    items: list[StudentScheduleItem] = field(default_factory=list)


# ---------- Conflict reporting ----------

class ConflictType(str, Enum):
    NO_ASSIGNMENT_POSSIBLE = "NO_ASSIGNMENT_POSSIBLE"
    NO_VACANCY = "NO_VACANCY"
    SHIFT_OVERFLOW = "SHIFT_OVERFLOW"
    PREREQUISITE_MISSING = "PREREQUISITE_MISSING"
    CREDIT_LIMIT_EXCEEDED = "CREDIT_LIMIT_EXCEEDED"
    COREQUISITE_BROKEN = "COREQUISITE_BROKEN"
    TRAVEL_TIME_VIOLATION = "TRAVEL_TIME_VIOLATION"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


@dataclass
class Conflict:
    conflict_type: ConflictType
    message: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    course_id: UUID | None = None
    time_slot_id: UUID | None = None
    details: dict | None = None


def chunked(iterable: Iterable, size: int):
    bucket: list = []
    for item in iterable:
        bucket.append(item)
        if len(bucket) >= size:
            yield bucket
            bucket = []
    if bucket:
        yield bucket
