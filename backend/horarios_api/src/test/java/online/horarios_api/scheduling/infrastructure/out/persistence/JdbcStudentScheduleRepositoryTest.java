package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JdbcStudentScheduleRepository — persistencia real contra Postgres (Testcontainers)")
class JdbcStudentScheduleRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcStudentScheduleRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcStudentScheduleRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("listPendingCourses: sin horario confirmado devuelve cursos pendientes sin secciones")
    void listPendingCourses_withoutConfirmedSchedule_returnsCoursesWithoutSections() {
        UUID period = fixtures.academicPeriod();
        UUID student = fixtures.student(2);
        fixtures.course("INF-101");

        List<StudentPendingCourse> pending = repository.listPendingCourses(student, period);

        assertThat(pending).extracting(StudentPendingCourse::courseCode).contains("INF-101");
        assertThat(pending.getFirst().sections()).isEmpty();
    }

    @Test
    @DisplayName("listPendingCourses: con horario confirmado incluye secciones y componentes asignados")
    void listPendingCourses_withConfirmedSchedule_includesSections() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period, "CONFIRMED");
        UUID student = fixtures.student(2);
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID classroom = fixtures.classroom("A-101");
        UUID teacher = fixtures.teacher("D-001");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID section = fixtures.courseSection(schedule, course, "00001", 1);
        UUID assignment = fixtures.courseScheduleAssignment(schedule, teacher, course, component, section);
        fixtures.courseAssignmentSlot(assignment, schedule, teacher, classroom, timeSlot, course, component,
                LocalTime.of(8, 0), LocalTime.of(9, 30));

        List<StudentPendingCourse> pending = repository.listPendingCourses(student, period);

        StudentPendingCourse course101 = pending.stream()
                .filter(c -> c.courseCode().equals("INF-101"))
                .findFirst().orElseThrow();
        assertThat(course101.sections()).hasSize(1);
        var sectionDto = course101.sections().getFirst();
        assertThat(sectionDto.nrc()).isEqualTo("00001");
        assertThat(sectionDto.components()).hasSize(1);
        var componentDto = sectionDto.components().getFirst();
        assertThat(componentDto.teacherCode()).isEqualTo("D-001");
        assertThat(componentDto.slots()).hasSize(1);
        assertThat(componentDto.slots().getFirst().classroomCode()).isEqualTo("A-101");
    }

    @Test
    @DisplayName("findActiveSchedule: sin horario activo devuelve Optional vacío")
    void findActiveSchedule_missing_returnsEmpty() {
        UUID period = fixtures.academicPeriod();
        UUID student = fixtures.student(2);

        assertThat(repository.findActiveSchedule(student, period)).isEmpty();
    }

    @Test
    @DisplayName("findActiveSchedule: con horario DRAFT devuelve los items y componentes")
    void findActiveSchedule_withDraftSchedule_returnsItems() {
        UUID period = fixtures.academicPeriod();
        UUID student = fixtures.student(2);
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID schedule = fixtures.teachingSchedule(period);
        UUID assignment = fixtures.courseScheduleAssignment(schedule, fixtures.teacher("D-001"), course, component, null);
        UUID studentSchedule = fixtures.studentSchedule(student, period, "DRAFT");
        UUID item = fixtures.studentScheduleItem(studentSchedule, student, course);
        fixtures.studentScheduleItemComponent(item, component, assignment);

        Optional<ActiveStudentSchedule> found = repository.findActiveSchedule(student, period);

        assertThat(found).isPresent();
        assertThat(found.get().status()).isEqualTo("DRAFT");
        assertThat(found.get().items()).hasSize(1);
        assertThat(found.get().items().getFirst().courseId()).isEqualTo(course);
        assertThat(found.get().items().getFirst().components()).hasSize(1);
    }
}
