package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.CourseSection;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JdbcCourseSectionRepository — persistencia real contra Postgres (Testcontainers)")
class JdbcCourseSectionRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcCourseSectionRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcCourseSectionRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("findByTeachingScheduleId: devuelve las secciones activas ordenadas por código")
    void findByTeachingScheduleId_returnsActiveSections() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period);
        UUID course = fixtures.course("INF-101");
        fixtures.courseSection(schedule, course, "00001", 1);
        fixtures.courseSection(schedule, course, "00002", 2);

        List<CourseSection> sections = repository.findByTeachingScheduleId(schedule);

        assertThat(sections).hasSize(2);
        assertThat(sections).extracting(CourseSection::sectionNumber).containsExactly(1, 2);
        assertThat(sections.getFirst().courseCode()).isEqualTo("INF-101");
    }

    @Test
    @DisplayName("findByTeachingScheduleId: sin secciones devuelve lista vacía")
    void findByTeachingScheduleId_noSections_returnsEmpty() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period);

        assertThat(repository.findByTeachingScheduleId(schedule)).isEmpty();
    }
}
