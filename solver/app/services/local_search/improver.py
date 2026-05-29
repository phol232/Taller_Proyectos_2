from __future__ import annotations

import random
import time as _time
from typing import TYPE_CHECKING

from app.core.logging import get_logger
from app.services.local_search.moves import (
    RetimeMove,
    RoomReassignMove,
    RoomSwapMove,
    RuinAndRecreateMove,
    TeacherReassignMove,
    TeacherSwapMove,
)

if TYPE_CHECKING:
    from app.domain.models import TeachingScheduleSolution
    from app.services.local_search.moves import ProposedMove
    from app.services.teacher_solver import TeacherScheduleSolver

log = get_logger(__name__)

_KICK_MIN_BUDGET_MS = 800


class LocalSearchImprover:
    """Hill Climbing + perturbación periódica para escapar óptimos locales."""

    def __init__(
        self,
        solver: "TeacherScheduleSolver",
        solution: "TeachingScheduleSolution",
        score: tuple,
        rng: random.Random,
        max_iters: int = 5000,
        patience: int = 400,
        max_kicks: int = 3,
    ):
        self._solver = solver
        self._current_solution = solution
        self._current_score = score
        self._best_solution = solution
        self._best_score = score
        self._rng = rng
        self._max_iters = max_iters
        self._patience = patience
        self._max_kicks = max_kicks
        self._moves = [
            RetimeMove(),
            RoomReassignMove(),
            TeacherReassignMove(),
            RoomSwapMove(),
            TeacherSwapMove(),
            RuinAndRecreateMove(),
        ]

        self._base_weights = [3.0, 2.0, 2.0, 1.0, 1.0, 1.5]
        self._aos_bonus_per_accept = 2.0
        self._move_accepts: dict[str, int] = {move.name: 0 for move in self._moves}
        self._kick_move = RetimeMove()
        self._initial_score = score
        self._badness_cache: dict[int, float] = {}
        self.metrics: dict[str, int | float | str] = {
            "local_search_iters": 0,
            "local_search_accepted": 0,
            "local_search_rejected": 0,
            "local_search_infeasible": 0,
            "local_search_kicks": 0,
            "local_search_post_kick_improvements": 0,
            "local_search_accepted_by_move": {move.name: 0 for move in self._moves},
            "ls_termination_reason": "NONE",
        }

    def _invalidate_badness(
        self,
        old_solution: "TeachingScheduleSolution",
        replacements: list,
    ) -> None:

        affected: set[int] = set()
        for idx, new_offer in replacements:
            affected.add(idx)
            old_offer = old_solution.offers[idx]
            old_room_days = {(old_offer.classroom_id, b.day) for b in old_offer.blocks}
            new_room_days = {(new_offer.classroom_id, b.day) for b in new_offer.blocks}
            for j, o in enumerate(self._current_solution.offers):
                if j == idx:
                    continue

                if (
                    (o.course_id == old_offer.course_id and o.classroom_id == old_offer.classroom_id)
                    or (o.course_id == new_offer.course_id and o.classroom_id == new_offer.classroom_id)
                ):
                    affected.add(j)
                    continue

                for b in o.blocks:
                    if (o.classroom_id, b.day) in old_room_days or (
                        o.classroom_id, b.day
                    ) in new_room_days:
                        affected.add(j)
                        break
        for idx in affected:
            self._badness_cache.pop(idx, None)

    def run(self, deadline_ts: float) -> tuple["TeachingScheduleSolution", tuple]:

        self._solver._badness_cache = self._badness_cache

        no_improvement = 0
        kicks_done = 0
        improved_since_last_kick = False
        unproductive_kicks_streak = 0
        total_iters = 0

        while total_iters < self._max_iters:
            if _time.monotonic() >= deadline_ts:
                self.metrics["ls_termination_reason"] = "BUDGET_EXCEEDED"
                break

            total_iters += 1
            self.metrics["local_search_iters"] = total_iters

            current_weights = [
                base + self._aos_bonus_per_accept * self._move_accepts[move.name]
                for base, move in zip(self._base_weights, self._moves)
            ]
            move = self._rng.choices(self._moves, weights=current_weights, k=1)[0]
            try:
                proposal: "ProposedMove | None" = move.propose(
                    self._solver, self._current_solution, self._rng
                )
            except Exception: 
                log.exception("local search move %s crashed; skipping", move.name)
                proposal = None

            if proposal is None:
                self.metrics["local_search_infeasible"] = int(self.metrics["local_search_infeasible"]) + 1
                no_improvement += 1
            else:
                candidate = proposal.apply_to(self._current_solution)
                new_score = self._solver._solution_quality_score(candidate, unassigned=0)

                if new_score < self._current_score:
                    old_solution = self._current_solution
                    self._current_solution = candidate
                    self._current_score = new_score
                    self._invalidate_badness(old_solution, proposal.replacements)
                    self.metrics["local_search_accepted"] = int(self.metrics["local_search_accepted"]) + 1
                    by_move: dict[str, int] = self.metrics["local_search_accepted_by_move"] 
                    by_move[proposal.kind] = by_move.get(proposal.kind, 0) + 1
                    self._move_accepts[proposal.kind] = self._move_accepts.get(proposal.kind, 0) + 1
                    no_improvement = 0

                    if new_score < self._best_score:
                        self._best_solution = candidate
                        self._best_score = new_score
                        if kicks_done > 0:
                            improved_since_last_kick = True
                else:
                    self.metrics["local_search_rejected"] = int(self.metrics["local_search_rejected"]) + 1
                    no_improvement += 1

            if no_improvement >= self._patience:
                remaining_ms = (deadline_ts - _time.monotonic()) * 1000
                if kicks_done > 0 and not improved_since_last_kick:
                    unproductive_kicks_streak += 1
                else:
                    unproductive_kicks_streak = 0
                if (
                    kicks_done < self._max_kicks
                    and remaining_ms >= _KICK_MIN_BUDGET_MS
                    and len(self._current_solution.offers) > 0
                    and unproductive_kicks_streak < 2
                ):
                    if kicks_done > 0 and improved_since_last_kick:
                        self.metrics["local_search_post_kick_improvements"] = (
                            int(self.metrics["local_search_post_kick_improvements"]) + 1
                        )
                    improved_since_last_kick = False
                    self._apply_kick()
                    kicks_done += 1
                    self.metrics["local_search_kicks"] = kicks_done
                    no_improvement = 0
                    continue

                self.metrics["ls_termination_reason"] = "CONVERGED"
                break
        else:
            self.metrics["ls_termination_reason"] = "MAX_ITERS"

        if kicks_done > 0 and improved_since_last_kick:
            self.metrics["local_search_post_kick_improvements"] = (
                int(self.metrics["local_search_post_kick_improvements"]) + 1
            )

        initial = self._initial_score[0] if self._initial_score else 0
        final = self._best_score[0] if self._best_score else 0
        improvement = 0.0
        if initial > 0:
            improvement = max(0.0, (initial - final) / initial * 100.0)
        self.metrics["local_search_initial_score"] = int(initial)
        self.metrics["local_search_final_score"] = int(final)
        self.metrics["local_search_improvement_pct"] = round(improvement, 2)

        return self._best_solution, self._best_score

    def _apply_kick(self) -> None:

        n_offers = len(self._current_solution.offers)
        if n_offers == 0:
            return
        k = max(2, n_offers // 20)
        applied = 0

        self._badness_cache.clear()
        for _ in range(k * 4):
            if applied >= k:
                break

            self._badness_cache.clear()
            proposal = self._kick_move.propose(
                self._solver, self._current_solution, self._rng
            )
            if proposal is None:
                continue
            self._current_solution = proposal.apply_to(self._current_solution)
            applied += 1

        self._current_score = self._solver._solution_quality_score(
            self._current_solution, unassigned=0
        )

        self._badness_cache.clear()
        log.debug(
            "local search kick: applied=%d/%d offers, post-kick score=%d",
            applied,
            k,
            self._current_score[0] if self._current_score else 0,
        )
