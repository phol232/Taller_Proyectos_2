package online.horarios_api.teacher.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;
import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;
import online.horarios_api.teacher.domain.port.out.TeacherPort;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TeacherJdbcAdapter implements TeacherPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Teacher> baseMapper = (rs, rowNum) -> new Teacher(
            rs.getObject("id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("code"),
            rs.getString("full_name"),
            rs.getString("specialty"),
            rs.getBoolean("is_active"),
            List.of(),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    @Override
    public Teacher create(TeacherData command) {
        try {
            Teacher created = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_teacher(?, ?, ?, ?, ?)",
                    baseMapper,
                    command.userId(),
                    command.code(),
                    command.fullName(),
                    command.specialty(),
                    command.isActive()
            );
            syncAvailability(created.id(), command.availability());
            return findById(created.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Teacher update(UUID teacherId, TeacherData command) {
        try {
            Teacher updated = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_teacher(?, ?, ?, ?, ?, ?)",
                    baseMapper,
                    teacherId,
                    command.userId(),
                    command.code(),
                    command.fullName(),
                    command.specialty(),
                    command.isActive()
            );
            syncAvailability(updated.id(), command.availability());
            return findById(updated.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Optional<Teacher> findById(UUID teacherId) {
        List<Teacher> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_teacher_by_id(?)",
                baseMapper,
                teacherId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public List<Teacher> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_teachers()", baseMapper)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<Teacher> searchByCodeOrName(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_teachers(?)", baseMapper, query)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public void deactivate(UUID teacherId) {
        jdbcTemplate.queryForObject("SELECT fn_deactivate_teacher(?)", Object.class, teacherId);
    }

    @Override
    public void delete(UUID teacherId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_teacher(?)", Object.class, teacherId);
        } catch (DataAccessException ex) {
            online.horarios_api.shared.domain.exception.ConflictException conflict =
                    online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private Teacher enrich(Teacher baseTeacher) {
        return new Teacher(
                baseTeacher.id(),
                baseTeacher.userId(),
                baseTeacher.code(),
                baseTeacher.fullName(),
                baseTeacher.specialty(),
                baseTeacher.isActive(),
                loadAvailability(baseTeacher.id()),
                baseTeacher.createdAt(),
                baseTeacher.updatedAt()
        );
    }

    private List<AvailabilitySlot> loadAvailability(UUID teacherId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_teacher_availability(?)",
                (rs, rowNum) -> new AvailabilitySlot(
                        ScheduleDay.valueOf(rs.getString("day_of_week")),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime(),
                        rs.getBoolean("is_available")
                ),
                teacherId
        );
    }

    private void syncAvailability(UUID teacherId, List<AvailabilitySlot> availability) {
        jdbcTemplate.queryForObject("SELECT fn_clear_teacher_availability(?)", Object.class, teacherId);
        if (availability == null) {
            return;
        }
        for (AvailabilitySlot slot : availability) {
            jdbcTemplate.queryForObject(
                    "SELECT fn_set_teacher_availability(?, CAST(? AS day_of_week), ?, ?, ?)",
                    Object.class,
                    teacherId,
                    slot.day().name(),
                    slot.startTime(),
                    slot.endTime(),
                    slot.available()
            );
        }
    }

    private RuntimeException mapException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_teachers_code")) {
            return new DuplicateFieldException("code", "El código de docente '" + code + "' ya está registrado.");
        }
        if (message.contains("uq_teachers_user_id")) {
            return new DuplicateFieldException("userId", "El usuario ya está vinculado a otro docente.");
        }
        if (message.contains("franja")) {
            return new BadRequestException(ex.getMostSpecificCause().getMessage());
        }
        return ex;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
