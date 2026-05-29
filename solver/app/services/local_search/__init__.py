"""Local search improver for Phase 1 (TeacherScheduleSolver).

Toma la solución construida por el greedy multi-restart y la pule mediante
Hill Climbing First-Improvement sobre vecindarios (movimientos) que mantienen
factibilidad respecto a H1-H9.
"""
from app.services.local_search.improver import LocalSearchImprover

__all__ = ["LocalSearchImprover"]
