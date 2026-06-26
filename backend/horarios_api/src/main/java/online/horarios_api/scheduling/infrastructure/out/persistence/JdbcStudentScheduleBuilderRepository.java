package online.horarios_api.scheduling.infrastructure.out.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.ConflictException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Array;
import java.sql.Connection;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JdbcStudentScheduleBuilderRepository implements StudentScheduleBuilderRepository {

    private static final TypeReference<List<Map<String, Object>>> ITEM_LIST_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Optional<StudentBuilderDraft> findDraft(UUID studentId, UUID academicPeriodId) {
        List<StudentBuilderDraft> rows = jdbcTemplate.query(
                "SELECT * FROM fn_student_builder_get_draft(?, ?)",
                (rs, rowNum) -> new StudentBuilderDraft(
                        rs.getObject("schedule_id", UUID.class),
                        rs.getShort("option_index"),
                        rs.getString("status"),
                        rs.getString("draft_source"),
                        rs.getInt("credit_limit"),
                        rs.getInt("total_credits"),
                        toInstant(rs.getTimestamp("expires_at")),
                        rs.getInt("seconds_remaining"),
                        rs.getInt("live_draft_count"),
                        parseItems(rs.getString("items"))
                ),
                studentId, academicPeriodId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    @Override
    public Optional<StudentBuilderDraft> findDraftBySchedule(UUID studentId, UUID scheduleId) {
        List<StudentBuilderDraft> rows = jdbcTemplate.query(
                "SELECT * FROM fn_student_builder_get_draft_by_schedule(?, ?)",
                (rs, rowNum) -> new StudentBuilderDraft(
                        rs.getObject("schedule_id", UUID.class),
                        rs.getShort("option_index"),
                        rs.getString("status"),
                        rs.getString("draft_source"),
                        rs.getInt("credit_limit"),
                        rs.getInt("total_credits"),
                        toInstant(rs.getTimestamp("expires_at")),
                        rs.getInt("seconds_remaining"),
                        rs.getInt("live_draft_count"),
                        parseItems(rs.getString("items"))
                ),
                studentId, scheduleId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    @Override
    public UUID ensureDraft(
            UUID studentId,
            UUID academicPeriodId,
            UUID actorId,
            int ttlSeconds,
            int maxLiveDrafts
    ) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT fn_student_builder_ensure_draft(?, ?, ?, ?, ?)",
                    UUID.class,
                    studentId, academicPeriodId, actorId, ttlSeconds, maxLiveDrafts
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public List<StudentScheduleConflict> validateAddCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds
    ) {
        return jdbcTemplate.query(
                connection -> {
                    Array sqlArray = toUuidArray(connection, assignmentIds);
                    var ps = connection.prepareStatement(
                            "SELECT * FROM fn_student_builder_validate(?, ?, ?, ?)");
                    ps.setObject(1, studentId);
                    ps.setObject(2, scheduleId);
                    ps.setObject(3, courseId);
                    ps.setArray(4, sqlArray);
                    return ps;
                },
                (rs, rowNum) -> new StudentScheduleConflict(
                        rs.getString("conflict_type"),
                        rs.getString("message"),
                        rs.getObject("resource_id", UUID.class)
                )
        );
    }

    @Override
    public UUID addCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds,
            UUID actorId,
            int ttlSeconds
    ) {
        try {
            return jdbcTemplate.execute((Connection connection) -> {
                Array sqlArray = toUuidArray(connection, assignmentIds);
                var ps = connection.prepareStatement(
                        "SELECT fn_student_builder_add_course(?, ?, ?, ?, ?, ?)");
                ps.setObject(1, studentId);
                ps.setObject(2, scheduleId);
                ps.setObject(3, courseId);
                ps.setArray(4, sqlArray);
                ps.setObject(5, actorId);
                ps.setInt(6, ttlSeconds);
                var rs = ps.executeQuery();
                if (!rs.next()) {
                    throw new BadRequestException("No se pudo agregar el curso al horario.");
                }
                return rs.getObject(1, UUID.class);
            });
        } catch (DataAccessException ex) {
            throw mapBuilderException(ex);
        }
    }

    @Override
    public void removeCourse(UUID scheduleId, UUID courseId) {
        try {
            jdbcTemplate.query(
                    "SELECT fn_student_builder_remove_course(?, ?)",
                    rs -> null,
                    scheduleId, courseId
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public UUID importFromOption(
            UUID studentId,
            UUID academicPeriodId,
            UUID sourceScheduleId,
            UUID actorId,
            int ttlSeconds,
            int maxLiveDrafts
    ) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT fn_student_builder_import_from(?, ?, ?, ?, ?, ?)",
                    UUID.class,
                    studentId, academicPeriodId, sourceScheduleId, actorId, ttlSeconds, maxLiveDrafts
            );
        } catch (DataAccessException ex) {
            throw mapBuilderException(ex);
        }
    }

    @Override
    public void renewHolds(UUID scheduleId, int ttlSeconds) {
        try {
            jdbcTemplate.queryForObject(
                    "SELECT fn_student_renew_holds(?, ?)",
                    Integer.class,
                    scheduleId, ttlSeconds
            );
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    private List<StudentBuilderDraft.StudentBuilderCourseItem> parseItems(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, ITEM_LIST_TYPE);
            List<StudentBuilderDraft.StudentBuilderCourseItem> out = new ArrayList<>(raw.size());
            for (Map<String, Object> item : raw) {
                out.add(new StudentBuilderDraft.StudentBuilderCourseItem(
                        toUuid(item.get("item_id")),
                        toUuid(item.get("course_id")),
                        toStr(item.get("course_code")),
                        toStr(item.get("course_name")),
                        toInt(item.get("course_credits")),
                        toUuid(item.get("section_id")),
                        toStr(item.get("nrc")),
                        toInt(item.get("section_number")),
                        parseComponents(item.get("components"))
                ));
            }
            return out;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("No se pudo leer el borrador del horario.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<StudentBuilderDraft.StudentBuilderComponent> parseComponents(Object value) {
        if (!(value instanceof List<?> raw)) return List.of();
        List<StudentBuilderDraft.StudentBuilderComponent> out = new ArrayList<>(raw.size());
        for (Object o : raw) {
            if (!(o instanceof Map<?, ?> m)) continue;
            Map<String, Object> comp = (Map<String, Object>) m;
            out.add(new StudentBuilderDraft.StudentBuilderComponent(
                    toUuid(comp.get("course_component_id")),
                    toUuid(comp.get("course_assignment_id")),
                    toStr(comp.get("component_type"))
            ));
        }
        return out;
    }

    private static Array toUuidArray(Connection connection, List<UUID> ids) throws java.sql.SQLException {
        UUID[] array = ids.toArray(UUID[]::new);
        return connection.createArrayOf("uuid", array);
    }

    private RuntimeException mapException(DataAccessException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        if (detail == null) return ex;
        return new BadRequestException(detail);
    }

    private RuntimeException mapBuilderException(DataAccessException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        if (detail == null) return ex;
        if (detail.contains("SIN_CUPO") || detail.contains("NO_VACANCY")) {
            return new ConflictException("No hay vacantes disponibles en la sección seleccionada.");
        }
        if (detail.contains(":")) {
            String[] parts = detail.split(":", 2);
            if (parts.length == 2) {
                return new ConflictException(parts[1].trim());
            }
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
}
