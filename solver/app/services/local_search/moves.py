from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import time
from typing import TYPE_CHECKING
from uuid import UUID

from app.domain.models import CourseOffer, DayOfWeek, ScheduledBlock

if TYPE_CHECKING:
    from app.domain.models import TeachingScheduleSolution
    from app.services.teacher_solver import TeacherScheduleSolver


@dataclass
class ProposedMove:
    """Cambio propuesto: reemplazar uno o más offers en el solution actual."""

    replacements: list[tuple[int, CourseOffer]]  # (offer_index, new_offer)
    kind: str

    def apply_to(self, solution: "TeachingScheduleSolution") -> "TeachingScheduleSolution":
        from app.domain.models import TeachingScheduleSolution

        new_offers = list(solution.offers)
        for idx, new_offer in self.replacements:
            new_offers[idx] = new_offer
        return TeachingScheduleSolution(
            teaching_schedule_id=solution.teaching_schedule_id,
            offers=new_offers,
            metrics=solution.metrics,
        )

def _busy_blocks(
    solution: "TeachingScheduleSolution",
    *,
    exclude_indices: set[int],
    teacher_id: UUID | None = None,
    classroom_id: UUID | None = None,
) -> tuple[list[tuple[DayOfWeek, time, time]], list[tuple[DayOfWeek, time, time]]]:
    """Devuelve (busy_teacher, busy_classroom) considerando offers != excluidos."""
    teacher_busy: list[tuple[DayOfWeek, time, time]] = []
    classroom_busy: list[tuple[DayOfWeek, time, time]] = []
    for i, o in enumerate(solution.offers):
        if i in exclude_indices:
            continue
        if teacher_id is not None and o.teacher_id == teacher_id:
            for b in o.blocks:
                teacher_busy.append((b.day, b.start_time, b.end_time))
        if classroom_id is not None and o.classroom_id == classroom_id:
            for b in o.blocks:
                classroom_busy.append((b.day, b.start_time, b.end_time))
    return teacher_busy, classroom_busy


def _h8_constraints_for_offer(
    solver: "TeacherScheduleSolver",
    solution: "TeachingScheduleSolution",
    offer_idx: int,
) -> tuple[int | None, time | None, tuple[int, time] | None]:

    from app.services.teacher_solver import _DAY_ORDER

    target = solution.offers[offer_idx]
    component = solver._data.course_components[target.course_component_id]
    is_theory = component.component_type.upper() == "THEORY"

    min_day_idx: int | None = None
    min_start: time | None = None
    practice_constraint: tuple[int, time] | None = None

    for i, o in enumerate(solution.offers):
        if i == offer_idx:
            continue
        if o.course_id != target.course_id:
            continue
        comp_o = solver._data.course_components.get(o.course_component_id)
        if comp_o is None:
            continue
        o_type = comp_o.component_type.upper()
        if not is_theory and o_type == "THEORY":
            last_block = max(
                o.blocks,
                key=lambda b: (_DAY_ORDER.get(b.day, 9), b.end_time),
            )
            cd = _DAY_ORDER.get(last_block.day, 9)
            if (
                min_day_idx is None
                or cd > min_day_idx
                or (cd == min_day_idx and last_block.end_time > (min_start or last_block.end_time))
            ):
                min_day_idx = cd
                min_start = last_block.end_time
        elif is_theory and o_type in ("PRACTICE", "GENERAL"):
            first_block = min(
                o.blocks,
                key=lambda b: (_DAY_ORDER.get(b.day, 9), b.start_time),
            )
            cd = _DAY_ORDER.get(first_block.day, 9)
            if (
                practice_constraint is None
                or cd < practice_constraint[0]
                or (cd == practice_constraint[0] and first_block.start_time < practice_constraint[1])
            ):
                practice_constraint = (cd, first_block.start_time)

    return min_day_idx, min_start, practice_constraint


def _check_group_feasible(
    group: tuple[ScheduledBlock, ...],
    *,
    teacher_busy: list[tuple[DayOfWeek, time, time]],
    classroom_busy: list[tuple[DayOfWeek, time, time]],
    practice_constraint: tuple[int, time] | None,
) -> bool:
    """Filtros duros: almuerzo, overlap docente/aula, descanso mínimo, H8 inverso."""
    from app.services.teacher_solver import (
        _BLOCK_LUNCH,
        _DAY_ORDER,
        _LUNCH_END,
        _LUNCH_START,
        _TEACHER_REST_HARD_MIN,
        _minutes_between,
        _overlaps,
    )

    # Almuerzo
    if _BLOCK_LUNCH and any(
        b.start_time < _LUNCH_END and b.end_time > _LUNCH_START for b in group
    ):
        return False

    for b in group:
        for d, s, e in teacher_busy:
            if d == b.day and _overlaps(b.start_time, b.end_time, s, e):
                return False

    for b in group:
        for d, s, e in classroom_busy:
            if d == b.day and _overlaps(b.start_time, b.end_time, s, e):
                return False

    for b in group:
        for d, s, e in teacher_busy:
            if d != b.day:
                continue
            if e <= b.start_time:
                gap = _minutes_between(e, b.start_time)
            elif b.end_time <= s:
                gap = _minutes_between(b.end_time, s)
            else:
                gap = 0
            if gap < _TEACHER_REST_HARD_MIN:
                return False

    if practice_constraint is not None:
        last_block = max(group, key=lambda b: (_DAY_ORDER.get(b.day, 9), b.end_time))
        last_day = _DAY_ORDER.get(last_block.day, 9)
        if last_day > practice_constraint[0] or (
            last_day == practice_constraint[0] and last_block.end_time > practice_constraint[1]
        ):
            return False

    return True


def _eligible_groups(
    solver: "TeacherScheduleSolver",
    *,
    teacher_id: UUID,
    classroom_id: UUID,
    required_blocks: int,
    min_day_idx: int | None,
    min_start: time | None,
) -> list[tuple[ScheduledBlock, ...]]:
    """Devuelve compact_block_groups según disponibilidad combinada."""
    from app.services.teacher_solver import (
        _BLOCK_WEEKENDS,
        _WEEKEND_DAYS,
        _compact_block_groups,
    )

    eligible = solver._blocks_inside_availability(
        teacher_id=teacher_id,
        classroom_id=classroom_id,
        min_day_idx=min_day_idx,
        min_start=min_start,
    )
    if _BLOCK_WEEKENDS:
        eligible = [b for b in eligible if b.day not in _WEEKEND_DAYS]
    return _compact_block_groups(eligible, required_blocks)


def _build_offer(
    *,
    template: CourseOffer,
    teacher_id: UUID,
    classroom_id: UUID,
    group: tuple[ScheduledBlock, ...],
) -> CourseOffer:
    """Construye un CourseOffer nuevo con el mismo template pero diferente colocación."""
    from app.services.teacher_solver import _DAY_ORDER

    first = min(group, key=lambda b: (_DAY_ORDER.get(b.day, 9), b.start_time))
    return CourseOffer(
        course_id=template.course_id,
        course_component_id=template.course_component_id,
        teacher_id=teacher_id,
        classroom_id=classroom_id,
        day=first.day,
        start_time=first.start_time,
        end_time=first.end_time,
        availability_slot_id=first.time_slot_id,
        max_capacity=template.max_capacity,
        section_number=template.section_number,
        blocks=list(group),
    )


def _fingerprint(blocks: list[ScheduledBlock] | tuple[ScheduledBlock, ...]) -> tuple:
    return tuple(sorted((b.day.value, b.start_time, b.end_time) for b in blocks))


def _offer_badness(
    solver: "TeacherScheduleSolver",
    solution: "TeachingScheduleSolution",
    idx: int,
) -> float:
    
    from app.services.teacher_solver import (
        _DAY_ORDER,
        _LUNCH_RECESS_START,
        _TRAVEL_GAP_MINUTES,
        _WEEKEND_DAYS,
        _minutes_between,
        _shift_score,
    )

    cache = getattr(solver, "_badness_cache", None)
    if cache is not None and idx in cache:
        return cache[idx]

    offer = solution.offers[idx]
    weight = 1.0

    if any(b.day in _WEEKEND_DAYS for b in offer.blocks):
        weight += 5.0

    section_idx = max(0, offer.section_number - 1)
    for b in offer.blocks:
        weight += _shift_score(b.start_time, section_idx) * 0.5

    course_id = offer.course_id
    classroom_id = offer.classroom_id
    blocks_days = {b.day for b in offer.blocks}
    for j, o in enumerate(solution.offers):
        if j == idx:
            continue
        if o.course_id == course_id and o.classroom_id == classroom_id:
            if any(b.day in blocks_days for b in o.blocks):
                weight += 2.0

    eligible = solver._eligible_classrooms_for_component(offer.course_component_id)
    if len(eligible) > 1 and solver._classroom_criticality().get(classroom_id, 0) > 0:
        weight += 1.5

    for b in offer.blocks:
        same_room_day_blocks: list[tuple] = []
        for j, o in enumerate(solution.offers):
            if o.classroom_id != classroom_id:
                continue
            for ob in o.blocks:
                if ob.day == b.day:
                    same_room_day_blocks.append((ob.start_time, ob.end_time, j == idx))
        if len(same_room_day_blocks) < 2:
            continue
        same_room_day_blocks.sort()
        for (prev_start, prev_end, prev_is_self), (next_start, next_end, next_is_self) in zip(
            same_room_day_blocks, same_room_day_blocks[1:]
        ):
            if not (prev_is_self or next_is_self):
                continue
            gap = _minutes_between(prev_end, next_start)
            expected = 30 if prev_end == _LUNCH_RECESS_START else _TRAVEL_GAP_MINUTES
            if gap > expected:
                weight += (gap - expected) * 0.05

    if cache is not None:
        cache[idx] = weight
    return weight


def _pick_offer_idx(
    solver: "TeacherScheduleSolver",
    solution: "TeachingScheduleSolution",
    rng: random.Random,
) -> int:
    """Muestrea un offer index con probabilidad proporcional a su 'malicia'."""
    n = len(solution.offers)
    if n == 0:
        return 0
    if n == 1:
        return 0
    weights = [_offer_badness(solver, solution, i) for i in range(n)]
    # rng.choices con pesos floats: positive guaranteed
    return rng.choices(range(n), weights=weights, k=1)[0]

class RetimeMove:
    """Reasigna los bloques de un offer (mismo teacher, misma aula, distintos slots)."""

    name = "retime"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        if not solution.offers:
            return None

        idx = _pick_offer_idx(solver, solution, rng)
        old = solution.offers[idx]
        required_blocks = len(old.blocks)
        if required_blocks <= 0:
            return None

        min_day_idx, min_start, practice_constraint = _h8_constraints_for_offer(
            solver, solution, idx
        )

        groups = _eligible_groups(
            solver,
            teacher_id=old.teacher_id,
            classroom_id=old.classroom_id,
            required_blocks=required_blocks,
            min_day_idx=min_day_idx,
            min_start=min_start,
        )
        if not groups:
            return None

        teacher_busy, classroom_busy = _busy_blocks(
            solution,
            exclude_indices={idx},
            teacher_id=old.teacher_id,
            classroom_id=old.classroom_id,
        )

        old_fp = _fingerprint(old.blocks)
        groups = list(groups)
        rng.shuffle(groups)
        for group in groups:
            if _fingerprint(group) == old_fp:
                continue
            if not _check_group_feasible(
                group,
                teacher_busy=teacher_busy,
                classroom_busy=classroom_busy,
                practice_constraint=practice_constraint,
            ):
                continue
            new_offer = _build_offer(
                template=old,
                teacher_id=old.teacher_id,
                classroom_id=old.classroom_id,
                group=group,
            )
            return ProposedMove(
                replacements=[(idx, new_offer)],
                kind=self.name,
            )
        return None


class RoomReassignMove:
    """Cambia el aula de un offer (mismo teacher, mismos slots si caben, o re-time)."""

    name = "room_reassign"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        if not solution.offers:
            return None

        idx = _pick_offer_idx(solver, solution, rng)
        old = solution.offers[idx]
        required_blocks = len(old.blocks)
        if required_blocks <= 0:
            return None

        eligible_rooms = solver._eligible_classrooms_for_component(old.course_component_id)
        eligible_rooms = [r for r in eligible_rooms if r != old.classroom_id]
        if not eligible_rooms:
            return None

        min_day_idx, min_start, practice_constraint = _h8_constraints_for_offer(
            solver, solution, idx
        )

        rng.shuffle(eligible_rooms)
        for classroom_id in eligible_rooms:
            groups = _eligible_groups(
                solver,
                teacher_id=old.teacher_id,
                classroom_id=classroom_id,
                required_blocks=required_blocks,
                min_day_idx=min_day_idx,
                min_start=min_start,
            )
            if not groups:
                continue
            teacher_busy, classroom_busy = _busy_blocks(
                solution,
                exclude_indices={idx},
                teacher_id=old.teacher_id,
                classroom_id=classroom_id,
            )
            groups = list(groups)
            rng.shuffle(groups)
            for group in groups:
                if not _check_group_feasible(
                    group,
                    teacher_busy=teacher_busy,
                    classroom_busy=classroom_busy,
                    practice_constraint=practice_constraint,
                ):
                    continue
                new_offer = _build_offer(
                    template=old,
                    teacher_id=old.teacher_id,
                    classroom_id=classroom_id,
                    group=group,
                )
                return ProposedMove(
                    replacements=[(idx, new_offer)],
                    kind=self.name,
                )
        return None


class TeacherReassignMove:
    """Cambia el docente de un offer (entre certificados para el componente)."""

    name = "teacher_reassign"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        if not solution.offers:
            return None

        idx = _pick_offer_idx(solver, solution, rng)
        old = solution.offers[idx]
        required_blocks = len(old.blocks)
        if required_blocks <= 0:
            return None

        eligible_teachers = list(
            solver._data.teacher_course_components.get(old.course_component_id, set())
        )
        eligible_teachers = [t for t in eligible_teachers if t != old.teacher_id]
        if not eligible_teachers:
            return None

        min_day_idx, min_start, practice_constraint = _h8_constraints_for_offer(
            solver, solution, idx
        )

        rng.shuffle(eligible_teachers)
        for teacher_id in eligible_teachers:
            groups = _eligible_groups(
                solver,
                teacher_id=teacher_id,
                classroom_id=old.classroom_id,
                required_blocks=required_blocks,
                min_day_idx=min_day_idx,
                min_start=min_start,
            )
            if not groups:
                continue
            teacher_busy, classroom_busy = _busy_blocks(
                solution,
                exclude_indices={idx},
                teacher_id=teacher_id,
                classroom_id=old.classroom_id,
            )
            groups = list(groups)
            rng.shuffle(groups)
            for group in groups:
                if not _check_group_feasible(
                    group,
                    teacher_busy=teacher_busy,
                    classroom_busy=classroom_busy,
                    practice_constraint=practice_constraint,
                ):
                    continue
                new_offer = _build_offer(
                    template=old,
                    teacher_id=teacher_id,
                    classroom_id=old.classroom_id,
                    group=group,
                )
                return ProposedMove(
                    replacements=[(idx, new_offer)],
                    kind=self.name,
                )
        return None


class RoomSwapMove:
    """Intercambia el aula entre dos offers compatibles, manteniendo sus bloques."""

    name = "room_swap"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        n = len(solution.offers)
        if n < 2:
            return None

        for _ in range(min(20, n)):
            i = _pick_offer_idx(solver, solution, rng)
            j = rng.randrange(n)
            if j == i:
                continue
            a = solution.offers[i]
            b = solution.offers[j]
            if a.classroom_id == b.classroom_id:
                continue

            a_eligible = solver._eligible_classrooms_for_component(a.course_component_id)
            b_eligible = solver._eligible_classrooms_for_component(b.course_component_id)
            if b.classroom_id not in a_eligible or a.classroom_id not in b_eligible:
                continue

            if not _classroom_supports_blocks(solver, b.classroom_id, a.blocks):
                continue
            if not _classroom_supports_blocks(solver, a.classroom_id, b.blocks):
                continue

            _, busy_b_room = _busy_blocks(
                solution, exclude_indices={i, j}, teacher_id=None, classroom_id=b.classroom_id
            )
            _, busy_a_room = _busy_blocks(
                solution, exclude_indices={i, j}, teacher_id=None, classroom_id=a.classroom_id
            )
            if _blocks_overlap_any(a.blocks, busy_b_room):
                continue
            if _blocks_overlap_any(b.blocks, busy_a_room):
                continue

            new_a = _build_offer(
                template=a,
                teacher_id=a.teacher_id,
                classroom_id=b.classroom_id,
                group=tuple(a.blocks),
            )
            new_b = _build_offer(
                template=b,
                teacher_id=b.teacher_id,
                classroom_id=a.classroom_id,
                group=tuple(b.blocks),
            )
            return ProposedMove(
                replacements=[(i, new_a), (j, new_b)],
                kind=self.name,
            )
        return None


class TeacherSwapMove:
    """Intercambia docente entre dos offers, ambos certificados para ambos componentes."""

    name = "teacher_swap"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        n = len(solution.offers)
        if n < 2:
            return None

        for _ in range(min(20, n)):
            i = _pick_offer_idx(solver, solution, rng)
            j = rng.randrange(n)
            if j == i:
                continue
            a = solution.offers[i]
            b = solution.offers[j]
            if a.teacher_id == b.teacher_id:
                continue

            a_certified = solver._data.teacher_course_components.get(a.course_component_id, set())
            b_certified = solver._data.teacher_course_components.get(b.course_component_id, set())
            if b.teacher_id not in a_certified or a.teacher_id not in b_certified:
                continue

            if not _teacher_supports_blocks(solver, b.teacher_id, a.blocks):
                continue
            if not _teacher_supports_blocks(solver, a.teacher_id, b.blocks):
                continue

            busy_b_teacher, _ = _busy_blocks(
                solution, exclude_indices={i, j}, teacher_id=b.teacher_id, classroom_id=None
            )
            busy_a_teacher, _ = _busy_blocks(
                solution, exclude_indices={i, j}, teacher_id=a.teacher_id, classroom_id=None
            )
            if _blocks_overlap_any(a.blocks, busy_b_teacher):
                continue
            if _blocks_overlap_any(b.blocks, busy_a_teacher):
                continue

            new_a = _build_offer(
                template=a,
                teacher_id=b.teacher_id,
                classroom_id=a.classroom_id,
                group=tuple(a.blocks),
            )
            new_b = _build_offer(
                template=b,
                teacher_id=a.teacher_id,
                classroom_id=b.classroom_id,
                group=tuple(b.blocks),
            )
            return ProposedMove(
                replacements=[(i, new_a), (j, new_b)],
                kind=self.name,
            )
        return None

def _classroom_supports_blocks(
    solver: "TeacherScheduleSolver",
    classroom_id: UUID,
    blocks: list[ScheduledBlock],
) -> bool:
    """¿El aula tiene disponibilidad en todos los bloques dados?"""
    from app.services.teacher_solver import _contains

    avail_slot_ids = solver._data.classroom_availability.get(classroom_id, set())
    if not avail_slot_ids:
        return False
    windows_by_day: dict[DayOfWeek, list[tuple[time, time]]] = {}
    for sid in avail_slot_ids:
        slot = solver._data.time_slots.get(sid)
        if slot is None:
            continue
        windows_by_day.setdefault(slot.day_of_week, []).append(
            (slot.start_time, slot.end_time)
        )
    for b in blocks:
        windows = windows_by_day.get(b.day, [])
        if not any(_contains(ws, we, b.start_time, b.end_time) for ws, we in windows):
            return False
    return True


def _teacher_supports_blocks(
    solver: "TeacherScheduleSolver",
    teacher_id: UUID,
    blocks: list[ScheduledBlock],
) -> bool:
    """¿El docente tiene disponibilidad en todos los bloques dados?"""
    from app.services.teacher_solver import _contains

    avail_slot_ids = solver._data.teacher_availability.get(teacher_id, set())
    if not avail_slot_ids:
        return False
    windows_by_day: dict[DayOfWeek, list[tuple[time, time]]] = {}
    for sid in avail_slot_ids:
        slot = solver._data.time_slots.get(sid)
        if slot is None:
            continue
        windows_by_day.setdefault(slot.day_of_week, []).append(
            (slot.start_time, slot.end_time)
        )
    for b in blocks:
        windows = windows_by_day.get(b.day, [])
        if not any(_contains(ws, we, b.start_time, b.end_time) for ws, we in windows):
            return False
    return True


def _blocks_overlap_any(
    blocks: list[ScheduledBlock],
    busy: list[tuple[DayOfWeek, time, time]],
) -> bool:
    from app.services.teacher_solver import _overlaps

    for b in blocks:
        for d, s, e in busy:
            if d == b.day and _overlaps(b.start_time, b.end_time, s, e):
                return True
    return False

def _snapshot_solver_state(solver: "TeacherScheduleSolver") -> dict:
    import copy

    return {
        "teacher_blocks": copy.deepcopy(solver._teacher_blocks),
        "classroom_blocks": copy.deepcopy(solver._classroom_blocks),
        "course_used_classrooms": copy.deepcopy(solver._course_used_classrooms),
        "classroom_day_course_count": copy.deepcopy(solver._classroom_day_course_count),
        "course_day_sections": copy.deepcopy(solver._course_day_sections),
        "course_theory_ends": copy.deepcopy(solver._course_theory_ends),
        "section_theory_end": copy.deepcopy(solver._section_theory_end),
        "section_teacher": copy.deepcopy(solver._section_teacher),
        "course_used_teachers": copy.deepcopy(solver._course_used_teachers),
        "metrics": copy.deepcopy(solver._metrics),
    }


def _restore_solver_state(solver: "TeacherScheduleSolver", snap: dict) -> None:
    solver._teacher_blocks = snap["teacher_blocks"]
    solver._classroom_blocks = snap["classroom_blocks"]
    solver._course_used_classrooms = snap["course_used_classrooms"]
    solver._classroom_day_course_count = snap["classroom_day_course_count"]
    solver._course_day_sections = snap["course_day_sections"]
    solver._course_theory_ends = snap["course_theory_ends"]
    solver._section_theory_end = snap["section_theory_end"]
    solver._section_teacher = snap["section_teacher"]
    solver._course_used_teachers = snap["course_used_teachers"]
    solver._metrics = snap["metrics"]


def _rehydrate_solver_state(
    solver: "TeacherScheduleSolver",
    offers: list[CourseOffer],
) -> None:
    from app.services.teacher_solver import _DAY_ORDER  # noqa: F401

    solver._reset_search_state()

    def order_key(o: CourseOffer) -> tuple:
        comp = solver._data.course_components.get(o.course_component_id)
        type_priority = 0 if (comp and comp.component_type.upper() == "THEORY") else 1
        return (type_priority, str(o.course_id), o.section_number)

    for offer in sorted(offers, key=order_key):
        section_idx = max(0, offer.section_number - 1)
        solver._apply_offer(offer, [], section_idx)

class RuinAndRecreateMove:

    name = "ruin_recreate"

    def propose(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        rng: random.Random,
    ) -> ProposedMove | None:
        n = len(solution.offers)
        if n < 3:
            return None

        k = max(2, n // 15)

        weights = [_offer_badness(solver, solution, i) for i in range(n)]
        ruined_indices: list[int] = []
        candidate_pool = list(range(n))
        for _ in range(min(k, n)):
            if not candidate_pool:
                break
            pool_weights = [weights[i] for i in candidate_pool]
            chosen = rng.choices(candidate_pool, weights=pool_weights, k=1)[0]
            ruined_indices.append(chosen)
            candidate_pool.remove(chosen)

        if not ruined_indices:
            return None

        snapshot = _snapshot_solver_state(solver)
        try:
           
            kept_offers = [
                o for i, o in enumerate(solution.offers) if i not in set(ruined_indices)
            ]
            _rehydrate_solver_state(solver, kept_offers)

            def ruined_order(idx: int) -> tuple:
                offer = solution.offers[idx]
                comp = solver._data.course_components.get(offer.course_component_id)
                type_priority = (
                    0 if (comp and comp.component_type.upper() == "THEORY") else 1
                )
                return (type_priority, str(offer.course_id), offer.section_number)

            ruined_indices_sorted = sorted(ruined_indices, key=ruined_order)

            replacements: list[tuple[int, CourseOffer]] = []
            for idx in ruined_indices_sorted:
                old = solution.offers[idx]
                section_idx = max(0, old.section_number - 1)

                try:
                    pool = []
                    for cand in solver._candidates(old.course_component_id, section_idx):
                        pool.append(cand)
                        if len(pool) >= 8:
                            break
                except Exception:  
                    pool = []
                if not pool:
                    return None

                pick_range = min(len(pool), 4)
                new_offer = pool[rng.randrange(pick_range)]
                new_offer.section_number = old.section_number
                solver._apply_offer(new_offer, [], section_idx)
                replacements.append((idx, new_offer))

            return ProposedMove(replacements=replacements, kind=self.name)
        finally:
            _restore_solver_state(solver, snapshot)
