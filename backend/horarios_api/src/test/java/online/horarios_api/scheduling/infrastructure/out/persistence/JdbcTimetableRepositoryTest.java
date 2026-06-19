package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.TimetableSlot;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JdbcTimetableRepository — persistencia real contra Postgres (Testcontainers)")
class JdbcTimetableRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcTimetableRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcTimetableRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("findByTeachingScheduleId: devuelve los slots asignados con aula, docente y curso")
    void findByTeachingScheduleId_returnsAssignedSlots() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period);
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID classroom = fixtures.classroom("A-101");
        UUID teacher = fixtures.teacher("D-001");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID section = fixtures.courseSection(schedule, course, "00001", 1);
        UUID assignment = fixtures.courseScheduleAssignment(schedule, teacher, course, component, section);
        fixtures.courseAssignmentSlot(assignment, schedule, teacher, classroom, timeSlot, course, component,
                LocalTime.of(8, 0), LocalTime.of(9, 30));

        List<TimetableSlot> slots = repository.findByTeachingScheduleId(schedule);

        assertThat(slots).hasSize(1);
        TimetableSlot slot = slots.getFirst();
        assertThat(slot.classroomCode()).isEqualTo("A-101");
        assertThat(slot.teacherCode()).isEqualTo("D-001");
        assertThat(slot.courseCode()).isEqualTo("INF-101");
        assertThat(slot.nrc()).isEqualTo("00001");
        assertThat(slot.startTime()).isEqualTo(LocalTime.of(8, 0));
    }

    @Test
    @DisplayName("findByTeachingScheduleId: sin asignaciones devuelve lista vacía")
    void findByTeachingScheduleId_noAssignments_returnsEmpty() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period);

        assertThat(repository.findByTeachingScheduleId(schedule)).isEmpty();
    }
}
