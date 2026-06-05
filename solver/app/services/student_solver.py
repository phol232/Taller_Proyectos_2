"""Phase 2: StudentScheduleSolver.

Greedy + local backtracking + GPA-based prioritisation.
Hard constraints H10–H15.
"""
from __future__ import annotations

import time as _time
from collections import defaultdict
from uuid import UUID

from app.core.logging import get_logger
from app.domain.models import (
    Conflict,
    ConflictType,
    Shift,
    Student,
    StudentScheduleItem,
    StudentScheduleSolution,
    TimeSlot,
)
from app.domain.solver_input import SolverInput
from app.services.corequisite_grouper import CorequisiteGrouper
from app.services.shift_filter import ShiftFilter
from app.services.travel_time import TravelTimeChecker
from app.services.vacancy_tracker import VacancyTracker

log = get_logger(__name__)


class StudentScheduleSolver:
    def __init__(
        self,
        data: SolverInput,
        offers: dict[UUID, dict],
        vacancy: VacancyTracker,
    ):
        self._data = data
        self._offers = offers              # assignment_id -> meta
        self._vacancy = vacancy
        self._shift_filter = ShiftFilter()
        self._travel = TravelTimeChecker(data.travel_times)
        self._grouper = CorequisiteGrouper(data.course_corequisites)

    # ------------------------------------------------------------------
    def solve_batch(self, *, time_limit_ms: int) -> tuple[list[StudentScheduleSolution], list[Conflict]]:
        """Solve all loaded students, ordered by GPA DESC."""
        deadline = _time.monotonic() + time_limit_ms / 1000.0
        results: list[StudentScheduleSolution] = []
        conflicts: list[Conflict] = []

        students = sorted(
            self._data.students.values(),
            key=lambda s: (-(s.gpa or 0.0), s.cycle, s.code),
        )
        for student in students:
            if _time.monotonic() > deadline:
                conflicts.append(Conflict(
                    ConflictType.TIME_LIMIT_EXCEEDED,
                    f"Phase 2 budget exceeded; remaining students unassigned",
                ))
                break
            sol, sc = self.solve_one(student)
            results.append(sol)
            conflicts.extend(sc)
        return results, conflicts

    # ------------------------------------------------------------------
    def solve_one(self, student: Student) -> tuple[StudentScheduleSolution, list[Conflict]]:
        solution = StudentScheduleSolution(student_id=student.id)
        conflicts: list[Conflict] = []

        candidates = self._candidate_courses(student, conflicts)
        if not candidates:
            return solution, conflicts

        groups = self._grouper.group(candidates)
        # Order groups: lower cycle first, then higher credits first.
        def group_key(group: list[UUID]):
            cycles = [self._data.courses[c].cycle for c in group]
            credits = sum(self._data.courses[c].credits for c in group)
            return (min(cycles), -credits)

        groups.sort(key=group_key)

        max_credits = min(student.credit_limit, self._data.period_max_credits)
        used_credits = 0
        used_slots: set[UUID] = set()
        used_offers: list[tuple[UUID, list[TimeSlot]]] = []  # (assignment_id, slots) for travel-check

        shifts: frozenset[Shift] = (
            student.preferred_shifts
            if student.preferred_shifts
            else frozenset({Shift.FLEXIBLE})
        )

        for group in groups:
            group_credits = sum(self._data.courses[c].credits for c in group)
            if used_credits + group_credits > max_credits:
                continue

            assigned = self._try_assign_group(
                group, student, shifts, used_slots, used_offers, conflicts,
            )
            if assigned is None:
                # Try adjacent shifts as fallback for shift-bound groups.
                fallback = None
                tried: set[Shift] = set(shifts)
                adjacent_pool: list[Shift] = []
                for sh in shifts:
                    for adj in self._shift_filter.adjacent_shifts(sh):
                        if adj not in tried and adj not in adjacent_pool:
                            adjacent_pool.append(adj)
                for alt_shift in adjacent_pool:
                    alt_shifts = frozenset({alt_shift})
                    fallback = self._try_assign_group(
                        group, student, alt_shifts, used_slots, used_offers, conflicts,
                    )
                    if fallback is not None:
                        conflicts.append(Conflict(
                            ConflictType.SHIFT_OVERFLOW,
                            f"student {student.code} placed in shift {alt_shift.value} for course group",
                            details={"group": [str(c) for c in group],
                                     "preferred_shifts": sorted(s.value for s in shifts),
                                     "used_shift": alt_shift.value},
                        ))
                        assigned = fallback
                        break

            if assigned is None:
                conflicts.append(Conflict(
                    ConflictType.NO_VACANCY,
                    f"no available offer for course group for student {student.code}",
                    details={"group": [str(c) for c in group]},
                ))
                continue

            for course_id, component_assignments, slots in assigned:
                solution.items.append(StudentScheduleItem(
                    course_id=course_id,
                    component_assignments=[
                        (component_id, assignment_id)
                        for component_id, assignment_id, _ in component_assignments
                    ],
                ))
                used_credits += self._data.courses[course_id].credits
                for s in slots:
                    used_slots.add(s.id)
                for _, assignment_id, component_slots in component_assignments:
                    used_offers.append((assignment_id, component_slots))

        return solution, conflicts

    # ------------------------------------------------------------------
    def _candidate_courses(
        self, student: Student, conflicts: list[Conflict]
    ) -> list[UUID]:
        out: list[UUID] = []
        for course in self._data.courses.values():
            if course.cycle > student.cycle:
                continue
            if course.id in student.completed_course_ids:
                continue
            prereqs = self._data.course_prerequisites.get(course.id, set())
            if not prereqs.issubset(student.completed_course_ids):
                continue
            component_ids = self._components_for_course(course.id)
            if not component_ids:
                continue
            if any(not self._vacancy.offers_for_component(component_id) for component_id in component_ids):
                continue
            out.append(course.id)
        # Sort by cycle ASC then credits DESC.
        out.sort(key=lambda cid: (self._data.courses[cid].cycle, -self._data.courses[cid].credits))
        return out

    def _try_assign_group(
        self,
        group: list[UUID],
        student: Student,
        shifts: frozenset[Shift],
        used_slots: set[UUID],
        used_offers: list[tuple[UUID, list[TimeSlot]]],
        conflicts: list[Conflict],
    ) -> list[tuple[UUID, list[tuple[UUID, UUID, list[TimeSlot]]], list[TimeSlot]]] | None:
        """Atomically try to allocate every course in the group.

        Returns list of (course_id, component_assignments, all_slots) if success.
        """
        chosen: list[tuple[UUID, list[tuple[UUID, UUID, list[TimeSlot]]], list[TimeSlot]]] = []
        reservations: list[UUID] = []
        local_used_slots = set(used_slots)
        local_used_offers = list(used_offers)

        for course_id in group:
            picked = self._pick_offers_for_course(
                course_id, shifts, local_used_slots, local_used_offers,
            )
            if picked is None:
                # Roll back reservations for this group.
                for r in reservations:
                    self._vacancy.release(r)
                return None
            all_slots: list[TimeSlot] = []
            for _, offer_id, slots in picked:
                reservations.append(offer_id)
                all_slots.extend(slots)
                for s in slots:
                    local_used_slots.add(s.id)
                local_used_offers.append((offer_id, slots))
            chosen.append((course_id, picked, all_slots))

        return chosen

    def _pick_offers_for_course(
        self,
        course_id: UUID,
        shifts: frozenset[Shift],
        used_slots: set[UUID],
        used_offers: list[tuple[UUID, list[TimeSlot]]],
    ) -> list[tuple[UUID, UUID, list[TimeSlot]]] | None:
        picked: list[tuple[UUID, UUID, list[TimeSlot]]] = []
        reservations: list[UUID] = []
        local_used_slots = set(used_slots)
        local_used_offers = list(used_offers)

        for component_id in self._components_for_course(course_id):
            offer_id, slots = self._pick_offer_for_component(
                component_id, shifts, local_used_slots, local_used_offers,
            )
            if offer_id is None:
                for reservation in reservations:
                    self._vacancy.release(reservation)
                return None
            reservations.append(offer_id)
            picked.append((component_id, offer_id, slots))
            for slot in slots:
                local_used_slots.add(slot.id)
            local_used_offers.append((offer_id, slots))

        return picked

    def _pick_offer_for_component(
        self,
        component_id: UUID,
        shifts: frozenset[Shift],
        used_slots: set[UUID],
        used_offers: list[tuple[UUID, list[TimeSlot]]],
    ) -> tuple[UUID | None, list[TimeSlot]]:
        offers = self._vacancy.offers_for_component(component_id)
        # Heuristic: prefer offers in earliest day/slot (S5).
        scored = []
        for aid in offers:
            if not self._vacancy.has_vacancy(aid):
                continue
            meta = self._offers[aid]
            slot_ids = meta["time_slot_ids"]
            slots = [self._data.time_slots[sid] for sid in slot_ids if sid in self._data.time_slots]
            if not slots:
                continue
            # H13 shift: cada slot debe entrar en alguno de los turnos preferidos.
            if not all(self._shift_filter.slot_in_any_shift(s, shifts) for s in slots):
                continue
            # H1/H2 student-side: no overlap with already used slots (also H12 indirectly).
            if any(s.id in used_slots for s in slots):
                continue
            # H15 travel time vs all previously chosen offers.
            if not self._travel_ok(slots, meta, used_offers):
                continue
            score = min((s.day_of_week.value, s.slot_order) for s in slots)
            scored.append((score, aid, slots))

        scored.sort(key=lambda x: x[0])
        for _, aid, slots in scored:
            if self._vacancy.reserve(aid):
                return aid, slots
        return None, []

    def _components_for_course(self, course_id: UUID) -> list[UUID]:
        components = [
            component
            for component in self._data.course_components.values()
            if component.course_id == course_id
        ]
        components.sort(key=lambda component: (component.sort_order, component.component_type))
        return [component.id for component in components]

    def _travel_ok(
        self,
        candidate_slots: list[TimeSlot],
        candidate_meta: dict,
        used_offers: list[tuple[UUID, list[TimeSlot]]],
    ) -> bool:
        c_classroom_id = candidate_meta["classroom_id"]
        c_building = self._data.classrooms[c_classroom_id].building_code if c_classroom_id else None
        for prev_aid, prev_slots in used_offers:
            prev_meta = self._offers[prev_aid]
            prev_classroom_id = prev_meta["classroom_id"]
            prev_building = (
                self._data.classrooms[prev_classroom_id].building_code
                if prev_classroom_id else None
            )
            for a in candidate_slots:
                for b in prev_slots:
                    if a.day_of_week != b.day_of_week:
                        continue
                    if not self._travel.is_feasible(a, c_building, b, prev_building):
                        return False
        return True
