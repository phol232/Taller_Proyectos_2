"""CorequisiteGrouper — atomically group courses bound by a corequisite relation."""
from __future__ import annotations

from uuid import UUID


class CorequisiteGrouper:
    def __init__(self, course_corequisites: dict[UUID, set[UUID]]):
        self._coreqs = course_corequisites

    def group(self, course_ids: list[UUID]) -> list[list[UUID]]:
        """Returns connected components (groups). Singletons appear as 1-element lists."""
        remaining = list(course_ids)
        seen: set[UUID] = set()
        groups: list[list[UUID]] = []
        in_set = set(remaining)

        for cid in remaining:
            if cid in seen:
                continue
            stack = [cid]
            component: list[UUID] = []
            while stack:
                node = stack.pop()
                if node in seen:
                    continue
                seen.add(node)
                if node in in_set:
                    component.append(node)
                for neighbor in self._coreqs.get(node, set()):
                    if neighbor in in_set and neighbor not in seen:
                        stack.append(neighbor)
            if component:
                groups.append(component)
        return groups
