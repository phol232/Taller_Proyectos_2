package online.horarios_api.scheduling.infrastructure.out.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.ScheduleAssignmentSlot;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.scheduling.domain.model.StudentScheduleOption;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.ConflictException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcStudentScheduleRepository implements StudentScheduleRepository {

    private static final TypeReference<List<Map<String, Object>>> SECTION_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> ITEM_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> PREREQ_LIST_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId) {
        try {
            return jdbcTemplate.query(
                    "SELECT * FROM fn_list_student_pending_courses(?, ?)",
                    (rs, rowNum) -> new StudentPendingCourse(
                            rs.getObject("course_id", UUID.class),
                            rs.getString("course_code"),
                            rs.getString("course_name"),
                            rs.getInt("course_cycle"),
                            rs.getInt("course_credits"),
                            rs.getBigDecimal("course_weekly_hours"),
                            rs.getInt("required_components"),
                            parsePrerequisites(rs.getString("prerequisites")),
                            parseSections(rs.getString("sections"))
                    ),
                    studentId, academicPeriodId
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public Optional<ActiveStudentSchedule> findActiveSchedule(UUID studentId, UUID academicPeriodId) {
        List<ActiveStudentSchedule> rows = jdbcTemplate.query(
                "SELECT * FROM fn_get_active_student_schedule(?, ?)",
                (rs, rowNum) -> new ActiveStudentSchedule(
                        rs.getObject("schedule_id", UUID.class),
                        rs.getString("status"),
                        parseItems(rs.getString("items"))
                ),
                studentId, academicPeriodId
        );
        if (rows.isEmpty() || rows.get(0).scheduleId() == null) {
            return Optional.empty();
        }
        return Optional.of(rows.get(0));
    }

    @Override
    public List<StudentScheduleOption> listScheduleOptions(UUID studentId, UUID academicPeriodId) {
        try {
            return jdbcTemplate.query(
                    "SELECT * FROM fn_student_list_schedule_options(?, ?)",
                    (rs, rowNum) -> new StudentScheduleOption(
                            rs.getObject("schedule_id", UUID.class),
                            rs.getInt("option_index"),
                            rs.getString("status"),
                            toInstant(rs.getTimestamp("created_at")),
                            toInstant(rs.getTimestamp("expires_at")),
                            rs.getInt("seconds_remaining"),
                            rs.getInt("item_count")
                    ),
                    studentId, academicPeriodId
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public String confirmSchedule(UUID studentId, UUID scheduleId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT fn_student_confirm_schedule(?, ?)",
                    String.class,
                    studentId, scheduleId
            );
        } catch (DataAccessException ex) {
            throw mapStudentException(ex);
        }
    }

    @Override
    public int renewHolds(UUID scheduleId, int ttlSeconds) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT fn_student_renew_holds(?, ?)",
                    Integer.class,
                    scheduleId, ttlSeconds
            );
            return count != null ? count : 0;
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public void releaseOption(UUID scheduleId) {
        try {
            jdbcTemplate.query(
                    "SELECT fn_student_release_option(?)",
                    resultSet -> null,
                    scheduleId
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public int expireSeatHolds() {
        Integer count = jdbcTemplate.queryForObject("SELECT fn_seat_holds_expire()", Integer.class);
        return count != null ? count : 0;
    }

    private List<StudentPendingCourse.CoursePrerequisite> parsePrerequisites(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, PREREQ_LIST_TYPE);
            List<StudentPendingCourse.CoursePrerequisite> out = new ArrayList<>(raw.size());
            for (Map<String, Object> p : raw) {
                out.add(new StudentPendingCourse.CoursePrerequisite(
                        toUuid(p.get("prerequisite_course_id")),
                        toStr(p.get("prerequisite_code")),
                        Boolean.TRUE.equals(p.get("is_satisfied"))
                ));
            }
            return out;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudieron leer los prerrequisitos.");
        }
    }

    private List<StudentPendingCourse.PendingCourseSection> parseSections(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, SECTION_LIST_TYPE);
            List<StudentPendingCourse.PendingCourseSection> out = new ArrayList<>(raw.size());
            for (Map<String, Object> sec : raw) {
                List<StudentPendingCourse.PendingCourseSectionComponent> comps =
                        parseComponents(sec.get("components"));
                out.add(new StudentPendingCourse.PendingCourseSection(
                        toUuid(sec.get("section_id")),
                        toStr(sec.get("nrc")),
                        toInt(sec.get("section_number")),
                        toInt(sec.get("available_vacancies")),
                        comps
                ));
            }
            return out;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudieron leer las secciones del horario.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<StudentPendingCourse.PendingCourseSectionComponent> parseComponents(Object value) {
        if (!(value instanceof List<?> raw)) return List.of();
        List<StudentPendingCourse.PendingCourseSectionComponent> out = new ArrayList<>(raw.size());
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            Map<String, Object> comp = (Map<String, Object>) m;
            out.add(new StudentPendingCourse.PendingCourseSectionComponent(
                    toUuid(comp.get("assignment_id")),
                    toUuid(comp.get("course_component_id")),
                    toStr(comp.get("component_type")),
                    toDecimal(comp.get("component_weekly_hours")),
                    toUuid(comp.get("teacher_id")),
                    toStr(comp.get("teacher_code")),
                    toStr(comp.get("teacher_name")),
                    parseSlots(comp.get("slots"))
            ));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<ScheduleAssignmentSlot> parseSlots(Object value) {
        if (!(value instanceof List<?> raw)) return List.of();
        List<ScheduleAssignmentSlot> out = new ArrayList<>(raw.size());
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            Map<String, Object> slot = (Map<String, Object>) m;
            out.add(new ScheduleAssignmentSlot(
                    toUuid(slot.get("slot_id")),
                    toUuid(slot.get("time_slot_id")),
                    toStr(slot.get("day_of_week")),
                    toStr(slot.get("start_time")),
                    toStr(slot.get("end_time")),
                    toUuid(slot.get("classroom_id")),
                    toStr(slot.get("classroom_code")),
                    toStr(slot.get("classroom_name"))
            ));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<ActiveStudentSchedule.StudentScheduleItem> parseItems(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, ITEM_LIST_TYPE);
            List<ActiveStudentSchedule.StudentScheduleItem> out = new ArrayList<>(raw.size());
            for (Map<String, Object> item : raw) {
                List<ActiveStudentSchedule.StudentScheduleItemComponent> comps = new ArrayList<>();
                Object compsRaw = item.get("components");
                if (compsRaw instanceof List<?> list) {
                    for (Object o : list) {
                        if (!(o instanceof Map<?, ?> m)) continue;
                        Map<String, Object> c = (Map<String, Object>) m;
                        comps.add(new ActiveStudentSchedule.StudentScheduleItemComponent(
                                toUuid(c.get("course_component_id")),
                                toUuid(c.get("course_assignment_id"))
                        ));
                    }
                }
                out.add(new ActiveStudentSchedule.StudentScheduleItem(
                        toUuid(item.get("student_schedule_item_id")),
                        toUuid(item.get("course_id")),
                        comps
                ));
            }
            return out;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudo leer el horario del estudiante.");
        }
    }

    private RuntimeException mapException(DataAccessException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        if (detail == null) return ex;
        return new BadRequestException(detail);
    }

    /** Mapea los errores de confirmación de la BD a estados HTTP semánticos. */
    private RuntimeException mapStudentException(DataAccessException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        if (detail == null) return ex;
        if (detail.contains("CUPO_EXPIRADO")) {
            return new ConflictException(
                    "El cupo de este horario ya no está disponible. Genera una nueva opción.");
        }
        if (detail.contains("NO_EXISTE") || detail.contains("ESTADO_INVALIDO")) {
            return new BadRequestException("La opción de horario ya no es válida.");
        }
        return new BadRequestException(detail);
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp != null ? timestamp.toInstant() : null;
    }

    private static UUID toUuid(Object value) {
        if (value == null) return null;
        if (value instanceof UUID u) return u;
        String s = value.toString();
        return s.isBlank() ? null : UUID.fromString(s);
    }

    private static String toStr(Object value) {
        return value == null ? null : value.toString();
    }

    private static Integer toInt(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(value.toString());
    }

    private static BigDecimal toDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal d) return d;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(value.toString());
    }
}
