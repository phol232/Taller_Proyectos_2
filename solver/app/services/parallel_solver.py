from __future__ import annotations

import math
import multiprocessing as mp
import os
import time as _time
from concurrent.futures import ProcessPoolExecutor
from uuid import UUID

from app.core.logging import get_logger
from app.domain.models import Conflict, TeachingScheduleSolution
from app.domain.solver_input import SolverInput
from app.services.demand_projector import CourseDemand
from app.services.teacher_solver import TeacherScheduleSolver

log = get_logger(__name__)

_WORKER_DATA: SolverInput | None = None
_WORKER_DEMAND: dict[UUID, CourseDemand] | None = None


def _worker_init() -> None:
    from app.infrastructure import cache

    cache._client = None
    cache._initialized = False


def _run_cycle(seed: int, time_limit_ms: int) -> tuple[TeachingScheduleSolution, list[Conflict]]:
    """Ejecuta un ciclo en el worker, leyendo la entrada heredada por COW."""
    data = _WORKER_DATA
    demand = _WORKER_DEMAND
    if data is None or demand is None:  # pragma: no cover - salvaguarda
        raise RuntimeError("worker sin datos de entrada heredados")
    solver = TeacherScheduleSolver(data, demand, seed=seed)
    return solver.solve_single_pass(time_limit_ms=time_limit_ms)


def _cycle_key(
    solution: TeachingScheduleSolution,
    expected_offers: int,
) -> tuple[int, int]:
    """Clave de comparación, idéntica a la del multi-start secuencial."""
    missing = max(0, expected_offers - len(solution.offers))
    score = int(solution.metrics.get("score", 0))
    return (missing, score)


def solve_phase1_parallel(
    data: SolverInput,
    demand: dict[UUID, CourseDemand],
    *,
    time_limit_ms: int,
    seed: int | None = None,
    n_workers: int = 2,
    n_cycles: int = 2,
    time_factor: float = 0.6,
) -> tuple[TeachingScheduleSolution, list[Conflict]]:
    """Resuelve la Fase 1 ejecutando ``n_cycles`` ciclos en paralelo.

    Cae a la ruta secuencial (``TeacherScheduleSolver.solve``) cuando no hay
    paralelismo efectivo (un solo worker/CPU) o si el pool no puede crearse.
    """
    effective_workers = max(1, min(n_workers, os.cpu_count() or 1))
    effective_cycles = max(1, n_cycles)

    if effective_workers <= 1 or effective_cycles <= 1:
        log.info("[Phase 1] paralelismo no efectivo (workers=%d, cycles=%d); usando ruta secuencial",
                 effective_workers, effective_cycles)
        return TeacherScheduleSolver(data, demand, seed=seed).solve(time_limit_ms=time_limit_ms)

    per_cycle_ms = max(1_000, int(time_limit_ms * time_factor))
    expected_offers = sum(dem.n_classrooms for dem in demand.values())
    base_seed = seed if seed is not None else 0

    start_ts = _time.monotonic()
    overall_deadline_ts = start_ts + time_limit_ms / 1000.0

    global _WORKER_DATA, _WORKER_DEMAND
    _WORKER_DATA = data
    _WORKER_DEMAND = demand

    global_best: TeachingScheduleSolution | None = None
    global_best_conflicts: list[Conflict] = []
    global_best_key: tuple[int, int] | None = None
    cycle_scores: list[int] = []
    waves_run = 0
    cycles_launched = 0
    agg_attempts = 0
    agg_candidates = 0
    early_stop_reason = "NONE"

    n_waves = math.ceil(effective_cycles / effective_workers)

    try:
        ctx = mp.get_context("fork")
        with ProcessPoolExecutor(
            max_workers=effective_workers,
            mp_context=ctx,
            initializer=_worker_init,
        ) as pool:
            for wave in range(n_waves):
                remaining_ms = (overall_deadline_ts - _time.monotonic()) * 1000
                if wave > 0 and remaining_ms < per_cycle_ms * 0.5:
                    early_stop_reason = "BUDGET_EXCEEDED"
                    break

                wave_cycles = min(
                    effective_workers,
                    effective_cycles - cycles_launched,
                )
                if wave_cycles <= 0:
                    break

                futures = [
                    pool.submit(_run_cycle, base_seed + cycles_launched + i, per_cycle_ms)
                    for i in range(wave_cycles)
                ]
                cycles_launched += wave_cycles
                waves_run += 1

                prev_best_score = global_best_key[1] if global_best_key is not None else None

                for fut in futures:
                    try:
                        solution, conflicts = fut.result()
                    except Exception:  # noqa: BLE001
                        log.exception("[Phase 1] ciclo paralelo falló; se ignora")
                        continue
                    # Acumular el trabajo de TODOS los ciclos, no solo el ganador.
                    agg_attempts += int(solution.metrics.get("attempts", 0))
                    agg_candidates += int(solution.metrics.get("candidates_evaluated", 0))
                    if not solution.offers:
                        continue
                    key = _cycle_key(solution, expected_offers)
                    cycle_scores.append(key[1])
                    if global_best_key is None or key < global_best_key:
                        global_best = solution
                        global_best_conflicts = conflicts
                        global_best_key = key

                # Early-stop entre oleadas: si la oleada no mejoró el score más de
                # un 10 % y ya tenemos una solución completa, no lanzamos la siguiente.
                if (
                    global_best is not None
                    and global_best_key is not None
                    and global_best_key[0] == 0
                    and prev_best_score is not None
                    and prev_best_score > 0
                ):
                    diff_pct = abs(global_best_key[1] - prev_best_score) / prev_best_score
                    if diff_pct < 0.10:
                        early_stop_reason = "CONVERGED"
                        log.info(
                            "[Phase 1] early-stop entre oleadas: scores similares "
                            "(%d -> %d, diff=%.1f%%)",
                            prev_best_score, global_best_key[1], diff_pct * 100,
                        )
                        break
    except Exception:  # noqa: BLE001
        log.exception("[Phase 1] pool paralelo falló; cayendo a ruta secuencial")
        return TeacherScheduleSolver(data, demand, seed=seed).solve(time_limit_ms=time_limit_ms)
    finally:
        _WORKER_DATA = None
        _WORKER_DEMAND = None

    if global_best is None:
        # Ningún ciclo produjo ofertas: reintento secuencial para diagnosticar.
        log.warning("[Phase 1] ningún ciclo paralelo produjo ofertas; reintento secuencial")
        return TeacherScheduleSolver(data, demand, seed=seed).solve(time_limit_ms=time_limit_ms)

    total_elapsed_ms = round((_time.monotonic() - start_ts) * 1000)
    global_best.metrics["missing_offers"] = global_best_key[0] if global_best_key else 0
    global_best.metrics["parallel_workers"] = effective_workers
    global_best.metrics["parallel_cycles"] = cycles_launched
    global_best.metrics["parallel_waves_run"] = waves_run
    global_best.metrics["early_stop_reason"] = early_stop_reason
    global_best.metrics["cycle_scores"] = ",".join(str(s) for s in cycle_scores)
    global_best.metrics["total_duration_ms"] = total_elapsed_ms
    # Compatibilidad con orchestrator._phase1_summary (espera estas claves).
    # hard_restarts = ciclos independientes adicionales al primero (análogo al
    # multi-start secuencial); total_* agregan el trabajo de todos los ciclos.
    global_best.metrics["hard_restarts"] = max(0, cycles_launched - 1)
    global_best.metrics["total_attempts"] = agg_attempts
    global_best.metrics["total_candidates"] = agg_candidates

    log.info(
        "[Phase 1] portafolio paralelo: %d ciclos en %d oleadas | workers=%d | scores=%s | best=%s | wall=%dms | stop=%s",
        cycles_launched, waves_run, effective_workers, cycle_scores,
        global_best_key[1] if global_best_key else 0, total_elapsed_ms, early_stop_reason,
    )

    return global_best, global_best_conflicts
