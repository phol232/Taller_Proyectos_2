package online.horarios_api.scheduling.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.CourseSection;
import online.horarios_api.scheduling.domain.port.out.CourseSectionRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcCourseSectionRepository implements CourseSectionRepository {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<CourseSection> findByTeachingScheduleId(UUID teachingScheduleId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_course_sections(?)",
                (rs, rowNum) -> new CourseSection(
                        rs.getObject("id", UUID.class),
                        teachingScheduleId,
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_code"),
                        rs.getString("course_name"),
                        rs.getString("nrc"),
                        rs.getInt("section_number")
                ),
                teachingScheduleId
        );
    }
}
