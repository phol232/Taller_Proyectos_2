package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JdbcStudentScheduleBuilderRepository — builder manual del estudiante")
class JdbcStudentScheduleBuilderRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcStudentScheduleBuilderRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcStudentScheduleBuilderRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("ensureDraft + addCourse + validate: flujo básico del constructor manual")
    void builderFlow_addCourseAndValidate() {
        UUID period = fixtures.academicPeriod();
        UUID teaching = fixtures.teachingSchedule(period, "CONFIRMED");
        UUID student = fixtures.student(2);
        UUID actor = fixtures.user("builder@test.local");
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID classroom = fixtures.classroom("A-101");
        UUID teacher = fixtures.teacher("D-001");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID section = fixtures.courseSection(teaching, course, "00001", 1);
        UUID assignment = fixtures.courseScheduleAssignment(teaching, teacher, course, component, section);
        fixtures.courseAssignmentSlot(assignment, teaching, teacher, classroom, timeSlot, course, component,
                LocalTime.of(8, 0), LocalTime.of(9, 30));

        UUID scheduleId = repository.ensureDraft(student, period, actor, 120, 3);
        List<StudentScheduleConflict> conflicts = repository.validateAddCourse(
                student, scheduleId, course, List.of(assignment));
        assertThat(conflicts).isEmpty();

        repository.addCourse(student, scheduleId, course, List.of(assignment), actor, 120);

        var draft = repository.findDraft(student, period);
        assertThat(draft).isPresent();
        assertThat(draft.get().items()).hasSize(1);
        assertThat(draft.get().totalCredits()).isGreaterThan(0);
    }
}
