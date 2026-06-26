package online.horarios_api.scheduling.infrastructure.out.persistence;

import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.util.UUID;

/**
 * Inserts mínimos vía SQL directo para satisfacer las FKs del esquema real
 * (academic_periods, teaching_schedules, courses, course_components, classrooms,
 * teachers, time_slots, course_sections, course_schedule_assignments,
 * course_assignment_slots) al probar los adaptadores JdbcTemplate de scheduling.
 */
final class SchedulingFixtures {

    private final JdbcTemplate jdbc;

    SchedulingFixtures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    UUID user(String email) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, 'ADMIN'::user_role)",
                id, email, "Usuario " + email
        );
        return id;
    }

    UUID academicPeriod() {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO academic_periods (id, code, name, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)",
                id, "2026-1-" + id.toString().substring(0, 8), "Periodo 2026-1",
                LocalDate.of(2026, Month.MARCH, 1), LocalDate.of(2026, Month.JULY, 15)
        );
        return id;
    }

    UUID teachingSchedule(UUID academicPeriodId) {
        return teachingSchedule(academicPeriodId, "DRAFT");
    }

    UUID teachingSchedule(UUID academicPeriodId, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO teaching_schedules (id, academic_period_id, status) VALUES (?, ?, ?)",
                id, academicPeriodId, status);
        return id;
    }

    UUID course(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO courses (id, code, name, credits, weekly_hours, required_room_type, cycle) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, code, "Curso " + code, 3, 3.0, "LABORATORY", 1
        );
        return id;
    }

    UUID courseComponent(UUID courseId, String componentType) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO course_components (id, course_id, component_type, weekly_hours, required_room_type, sort_order) " +
                        "VALUES (?, ?, ?, ?, ?, ?)",
                id, courseId, componentType, 3.0, "LABORATORY", 1
        );
        return id;
    }

    UUID classroom(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO classrooms (id, code, name, capacity, room_type) VALUES (?, ?, ?, ?, ?)",
                id, code, "Aula " + code, 30, "LABORATORY"
        );
        return id;
    }

    UUID teacher(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO teachers (id, code, full_name, specialty) VALUES (?, ?, ?, ?)",
                id, code, "Docente " + code, "General"
        );
        return id;
    }

    UUID timeSlot(LocalTime start, LocalTime end) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO time_slots (id, day_of_week, start_time, end_time, slot_order) " +
                        "VALUES (?, 'MONDAY'::day_of_week, ?, ?, 1)",
                id, start, end
        );
        return id;
    }

    UUID courseSection(UUID teachingScheduleId, UUID courseId, String nrc, int sectionNumber) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO course_sections (id, teaching_schedule_id, course_id, nrc, section_number) " +
                        "VALUES (?, ?, ?, ?, ?)",
                id, teachingScheduleId, courseId, nrc, sectionNumber
        );
        return id;
    }

    UUID courseScheduleAssignment(UUID teachingScheduleId, UUID teacherId, UUID courseId,
                                   UUID courseComponentId, UUID sectionId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO course_schedule_assignments " +
                        "(id, teaching_schedule_id, teacher_id, course_id, course_component_id, section_id, max_capacity) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, teachingScheduleId, teacherId, courseId, courseComponentId, sectionId, 30
        );
        return id;
    }

    void courseAssignmentSlot(UUID assignmentId, UUID teachingScheduleId, UUID teacherId, UUID classroomId,
                               UUID timeSlotId, UUID courseId, UUID courseComponentId,
                               LocalTime start, LocalTime end) {
        jdbc.update(
                "INSERT INTO course_assignment_slots " +
                        "(id, course_assignment_id, teaching_schedule_id, teacher_id, classroom_id, time_slot_id, " +
                        " course_id, course_component_id, slot_start_time, slot_end_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), assignmentId, teachingScheduleId, teacherId, classroomId, timeSlotId,
                courseId, courseComponentId, start, end
        );
    }

    UUID student(int cycle) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO students (id, code, full_name, cycle) VALUES (?, ?, ?, ?)",
                id, "E-" + id.toString().substring(0, 8), "Estudiante de Prueba", cycle
        );
        return id;
    }

    UUID studentSchedule(UUID studentId, UUID academicPeriodId, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO student_schedules (id, student_id, academic_period_id, status) VALUES (?, ?, ?, ?)",
                id, studentId, academicPeriodId, status
        );
        return id;
    }

    UUID studentScheduleItem(UUID studentScheduleId, UUID studentId, UUID courseId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO student_schedule_items (id, student_schedule_id, student_id, course_id) VALUES (?, ?, ?, ?)",
                id, studentScheduleId, studentId, courseId
        );
        return id;
    }

    void studentScheduleItemComponent(UUID itemId, UUID courseComponentId, UUID courseAssignmentId) {
        jdbc.update(
                "INSERT INTO student_schedule_item_components " +
                        "(id, student_schedule_item_id, course_component_id, course_assignment_id) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), itemId, courseComponentId, courseAssignmentId
        );
    }

    UUID solverRun(UUID academicPeriodId, UUID teachingScheduleId, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO solver_runs (id, run_type, academic_period_id, teaching_schedule_id, status, seed) " +
                        "VALUES (?, 'TEACHER', ?, ?, ?, 42)",
                id, academicPeriodId, teachingScheduleId, status
        );
        return id;
    }

    void teacherCourseComponent(UUID teacherId, UUID courseComponentId) {
        jdbc.update(
                "INSERT INTO teacher_course_components (id, teacher_id, course_component_id) VALUES (?, ?, ?)",
                UUID.randomUUID(), teacherId, courseComponentId
        );
    }

    void teacherAvailability(UUID teacherId, UUID timeSlotId, boolean available) {
        jdbc.update(
                "INSERT INTO teacher_availability (id, teacher_id, time_slot_id, is_available) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), teacherId, timeSlotId, available
        );
    }

    void solverRunConflict(UUID runId, String conflictType, String message) {
        jdbc.update(
                "INSERT INTO solver_run_conflicts (id, solver_run_id, conflict_type, message) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), runId, conflictType, message
        );
    }
}
