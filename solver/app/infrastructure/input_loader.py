"""Loads all solver inputs from PostgreSQL — exclusively via PL/pgSQL functions."""
from __future__ import annotations

from collections import defaultdict
from typing import Any
from uuid import UUID

from app.core.db import get_connection
from app.domain.models import (
    Classroom,
    Course,
    CourseComponent,
    CourseSchedulingRule,
    DayOfWeek,
    Shift,
    Student,
    Teacher,
    TimeSlot,
)
from app.domain.solver_input import SolverInput

__all__ = ["SolverInput", "SolverInputLoader"]


class SolverInputLoader:
    """All reads go through fn_solver_* functions (no raw table access)."""

    def load(
        self,
        academic_period_id: UUID,
        *,
        load_students: bool = False,
        student_id: UUID | None = None,
    ) -> SolverInput:
        with get_connection() as conn, conn.cursor() as cur:
            period = self._call_period(cur, academic_period_id)
            data = SolverInput(
                academic_period_id=academic_period_id,
                period_max_credits=period["max_student_credits"],
            )

            self._load_courses(cur, data)
            self._load_course_rules(cur, data)
            self._load_course_components(cur, data)
            self._load_teachers(cur, data)
            self._load_classrooms(cur, data)
            self._load_time_slots(cur, data)
            self._load_teacher_courses(cur, data)
            self._load_teacher_course_components(cur, data)
            self._load_classroom_courses(cur, data)
            self._load_classroom_course_components(cur, data)
            self._normalize_classroom_course_scope(data)
            self._load_teacher_availability(cur, data)
            self._load_classroom_availability(cur, data)
            self._load_course_prerequisites(cur, data)
            self._load_course_corequisites(cur, data)
            self._load_travel_times(cur, data)
            self._load_confirmed_schedule(cur, data)

            if load_students:
                self._load_students(cur, data, student_id=student_id)

            return data

    # ---------- private ----------

    def _call_period(self, cur, period_id: UUID) -> dict[str, Any]:
        cur.execute("SELECT * FROM fn_solver_get_period(%s)", (period_id,))
        row = cur.fetchone()
        if row is None:
            raise ValueError(f"academic_period {period_id} not found")
        return row

    def _load_courses(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_active_courses()")
        for r in cur.fetchall():
            data.courses[r["id"]] = Course(
                id=r["id"],
                code=r["code"],
                name=r["name"],
                cycle=r["cycle"],
                credits=r["credits"],
                required_credits=r["required_credits"],
                weekly_hours=r["weekly_hours"],
                required_room_type=r["required_room_type"],
            )

    def _load_course_components(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_active_course_components()")
        for r in cur.fetchall():
            data.course_components[r["id"]] = CourseComponent(
                id=r["id"],
                course_id=r["course_id"],
                component_type=r["component_type"],
                weekly_hours=r["weekly_hours"],
                required_room_type=r["required_room_type"],
                sort_order=r["sort_order"],
            )

    def _load_course_rules(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_course_rules()")
        for r in cur.fetchall():
            data.course_rules[r["course_id"]] = CourseSchedulingRule(
                course_id=r["course_id"],
                scheduling_kind=r["scheduling_kind"],
                elective_group_code=r["elective_group_code"],
                max_sections=r["max_sections"],
                priority=r["priority"],
                placement_strategy=r["placement_strategy"],
            )

    def _load_teachers(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_active_teachers()")
        for r in cur.fetchall():
            data.teachers[r["id"]] = Teacher(
                id=r["id"], code=r["code"], full_name=r["full_name"]
            )

    def _load_classrooms(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_active_classrooms()")
        for r in cur.fetchall():
            data.classrooms[r["id"]] = Classroom(
                id=r["id"],
                code=r["code"],
                name=r["name"],
                capacity=r["capacity"],
                room_type=r["room_type"],
                building_code=r["building_code"],
            )

    def _load_time_slots(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_active_time_slots()")
        for r in cur.fetchall():
            data.time_slots[r["id"]] = TimeSlot(
                id=r["id"],
                day_of_week=DayOfWeek(r["day_of_week"]),
                start_time=r["start_time"],
                end_time=r["end_time"],
                slot_order=r["slot_order"],
            )

    def _load_teacher_courses(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_teacher_courses()")
        for r in cur.fetchall():
            data.teacher_courses[r["course_id"]].add(r["teacher_id"])

    def _load_teacher_course_components(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_teacher_course_components()")
        for r in cur.fetchall():
            data.teacher_course_components[r["course_component_id"]].add(r["teacher_id"])

    def _load_classroom_courses(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_classroom_courses()")
        for r in cur.fetchall():
            data.classroom_courses[r["course_id"]].add(r["classroom_id"])

    def _load_classroom_course_components(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_classroom_course_components()")
        for r in cur.fetchall():
            data.classroom_course_components[r["course_component_id"]].add(r["classroom_id"])

    def _normalize_classroom_course_scope(self, data: SolverInput) -> None:
        """Evita que filas padre usadas por UI se lean como restricción global.

        Cuando un aula tiene componentes explícitos de un curso, esa relación
        por componente es la fuente precisa. La fila en classroom_courses puede
        existir solo para listar el curso en la UI y no debe autorizar todos sus
        componentes dentro de esa misma aula.
        """
        scoped_by_course: dict[UUID, set[UUID]] = defaultdict(set)
        for component_id, classroom_ids in data.classroom_course_components.items():
            component = data.course_components.get(component_id)
            if component is None:
                continue
            scoped_by_course[component.course_id].update(classroom_ids)

        for course_id, scoped_classroom_ids in scoped_by_course.items():
            if course_id not in data.classroom_courses:
                continue
            remaining = data.classroom_courses[course_id] - scoped_classroom_ids
            if remaining:
                data.classroom_courses[course_id] = remaining
            else:
                data.classroom_courses.pop(course_id, None)

    def _load_teacher_availability(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_teacher_availability()")
        for r in cur.fetchall():
            data.teacher_availability[r["teacher_id"]].add(r["time_slot_id"])

    def _load_classroom_availability(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_classroom_availability()")
        for r in cur.fetchall():
            data.classroom_availability[r["classroom_id"]].add(r["time_slot_id"])

    def _load_course_prerequisites(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_course_prerequisites()")
        for r in cur.fetchall():
            data.course_prerequisites[r["course_id"]].add(r["prerequisite_course_id"])

    def _load_course_corequisites(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_course_corequisites()")
        for r in cur.fetchall():
            data.course_corequisites[r["course_id"]].add(r["corequisite_id"])
            data.course_corequisites[r["corequisite_id"]].add(r["course_id"])

    def _load_travel_times(self, cur, data: SolverInput) -> None:
        cur.execute("SELECT * FROM fn_solver_list_building_travel_times()")
        for r in cur.fetchall():
            data.travel_times[r["building_a"]][r["building_b"]] = r["minutes"]
            data.travel_times[r["building_b"]][r["building_a"]] = r["minutes"]

    def _load_confirmed_schedule(self, cur, data: SolverInput) -> None:
        cur.execute(
            "SELECT fn_solver_get_confirmed_teaching_schedule(%s) AS id",
            (data.academic_period_id,),
        )
        row = cur.fetchone()
        data.confirmed_teaching_schedule_id = row["id"] if row else None

    def _load_students(
        self, cur, data: SolverInput, *, student_id: UUID | None = None
    ) -> None:
        cur.execute("SELECT * FROM fn_solver_list_students(%s)", (student_id,))
        student_rows = cur.fetchall()

        student_ids = [r["id"] for r in student_rows]
        completed: dict[UUID, set[UUID]] = defaultdict(set)
        if student_ids:
            cur.execute(
                "SELECT * FROM fn_solver_list_completed_courses(%s)",
                (student_ids,),
            )
            for r in cur.fetchall():
                completed[r["student_id"]].add(r["course_id"])

        for r in student_rows:
            shifts: set[Shift] = set()
            raw = r["preferred_shift"]
            if raw:
                for token in str(raw).split(","):
                    token = token.strip()
                    if not token:
                        continue
                    try:
                        shifts.add(Shift(token))
                    except ValueError:
                        pass
            gpa = float(r["gpa"]) if r["gpa"] is not None else None
            data.students[r["id"]] = Student(
                id=r["id"],
                code=r["code"],
                full_name=r["full_name"],
                cycle=r["cycle"],
                credit_limit=r["credit_limit"],
                gpa=gpa,
                preferred_shifts=frozenset(shifts),
                completed_course_ids=frozenset(completed.get(r["id"], set())),
            )
