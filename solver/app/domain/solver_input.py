"""Aggregated solver input — DB-free dataclass."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from uuid import UUID

from app.domain.models import (
    Classroom,
    Course,
    CourseComponent,
    CourseSchedulingRule,
    Student,
    Teacher,
    TimeSlot,
)


@dataclass
class SolverInput:
    """Aggregated, period-scoped input for both Phase 1 and Phase 2."""

    academic_period_id: UUID
    period_max_credits: int

    courses: dict[UUID, Course] = field(default_factory=dict)
    course_components: dict[UUID, CourseComponent] = field(default_factory=dict)
    teachers: dict[UUID, Teacher] = field(default_factory=dict)
    classrooms: dict[UUID, Classroom] = field(default_factory=dict)
    time_slots: dict[UUID, TimeSlot] = field(default_factory=dict)
    course_rules: dict[UUID, CourseSchedulingRule] = field(default_factory=dict)

    teacher_courses: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    teacher_course_components: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    classroom_courses: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    classroom_course_components: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    teacher_availability: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    classroom_availability: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))

    course_prerequisites: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))
    course_corequisites: dict[UUID, set[UUID]] = field(default_factory=lambda: defaultdict(set))

    students: dict[UUID, Student] = field(default_factory=dict)

    travel_times: dict[str, dict[str, int]] = field(default_factory=lambda: defaultdict(dict))

    confirmed_teaching_schedule_id: UUID | None = None
