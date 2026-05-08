"""DemandProjector — calculates how many classroom-offers each component needs."""
from __future__ import annotations

import math
from dataclasses import dataclass
from uuid import UUID

from app.domain.solver_input import SolverInput


@dataclass
class CourseDemand:
    course_id: UUID
    course_component_id: UUID
    eligible_students: int
    avg_classroom_capacity: int
    n_classrooms: int


class DemandProjector:

    def project(self, data: SolverInput) -> dict[UUID, CourseDemand]:
        out: dict[UUID, CourseDemand] = {}

        for component in data.course_components.values():
            course = data.courses[component.course_id]
            eligible = self._count_eligible_students(data, course.id, course.cycle)
            avg_cap = self._avg_classroom_capacity(
                data,
                course.id,
                component.id,
                component.required_room_type,
            )
            if avg_cap <= 0:
                n = 1
            else:
                n = max(1, math.ceil(eligible / avg_cap)) if eligible > 0 else 1
            # Mínimo 1 sección, máximo 3 para dar opciones de horario sin choques
            n = min(max(n, 1), 3)
            out[component.id] = CourseDemand(
                course_id=course.id,
                course_component_id=component.id,
                eligible_students=eligible,
                avg_classroom_capacity=avg_cap,
                n_classrooms=n,
            )
        return out

    # ---------- helpers ----------

    def _count_eligible_students(self, data: SolverInput, course_id: UUID, cycle: int) -> int:
        if not data.students:
            return 0
        prereqs = data.course_prerequisites.get(course_id, set())
        count = 0
        for s in data.students.values():
            if s.cycle < cycle:
                continue
            if course_id in s.completed_course_ids:
                continue
            if not prereqs.issubset(s.completed_course_ids):
                continue
            count += 1
        return count

    def _avg_classroom_capacity(
        self,
        data: SolverInput,
        course_id: UUID,
        component_id: UUID,
        required_room_type: str,
    ) -> int:
        component_ids = data.classroom_course_components.get(component_id)
        compatible_ids = (
            data.classroom_courses.get(course_id, set()) & component_ids
            if component_ids
            else data.classroom_courses.get(course_id, set())
        )
        if not compatible_ids:
            return 0
        capacities = [
            data.classrooms[cid].capacity
            for cid in compatible_ids
            if cid in data.classrooms
            and data.classrooms[cid].room_type == required_room_type
        ]
        if not capacities:
            return 0
        return int(sum(capacities) / len(capacities))
