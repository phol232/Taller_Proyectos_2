package online.horarios_api.scheduling.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.TimetableSlot;
import online.horarios_api.scheduling.domain.port.out.TimetableRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcTimetableRepository implements TimetableRepository {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<TimetableSlot> findByTeachingScheduleId(UUID teachingScheduleId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_get_schedule_timetable(?)",
                (rs, rowNum) -> new TimetableSlot(
                        rs.getObject("slot_id", UUID.class),
                        rs.getObject("classroom_id", UUID.class),
                        rs.getString("classroom_code"),
                        rs.getString("classroom_name"),
                        rs.getString("classroom_type"),
                        rs.getObject("teacher_id", UUID.class),
                        rs.getString("teacher_code"),
                        rs.getString("teacher_name"),
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_code"),
                        rs.getString("course_name"),
                        rs.getString("component_type"),
                        rs.getObject("section_id", UUID.class),
                        rs.getString("nrc"),
                        rs.getInt("section_number"),
                        rs.getString("day_of_week"),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime()
                ),
                teachingScheduleId
        );
    }
}
