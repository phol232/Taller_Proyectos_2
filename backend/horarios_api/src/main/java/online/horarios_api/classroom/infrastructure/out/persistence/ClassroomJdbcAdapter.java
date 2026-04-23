package online.horarios_api.classroom.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.classroom.domain.port.out.ClassroomPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;
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
public class ClassroomJdbcAdapter implements ClassroomPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Classroom> baseMapper = (rs, rowNum) -> new Classroom(
            rs.getObject("id", UUID.class),
            rs.getString("code"),
            rs.getString("name"),
            rs.getInt("capacity"),
            rs.getString("room_type"),
            rs.getBoolean("is_active"),
            List.of(),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    @Override
    public Classroom create(ClassroomData command) {
        try {
            Classroom created = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_classroom(?, ?, ?, ?, ?)",
                    baseMapper,
                    command.code(),
                    command.name(),
                    command.capacity(),
                    command.type(),
                    command.isActive()
            );
            syncAvailability(created.id(), command.availability());
            return findById(created.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Classroom update(UUID classroomId, ClassroomData command) {
        try {
            Classroom updated = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_classroom(?, ?, ?, ?, ?, ?)",
                    baseMapper,
                    classroomId,
                    command.code(),
                    command.name(),
                    command.capacity(),
                    command.type(),
                    command.isActive()
            );
            syncAvailability(updated.id(), command.availability());
            return findById(updated.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Optional<Classroom> findById(UUID classroomId) {
        List<Classroom> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_classroom_by_id(?)",
                baseMapper,
                classroomId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public List<Classroom> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_classrooms()", baseMapper)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<Classroom> searchByCodeOrName(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_classrooms(?)", baseMapper, query)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public void deactivate(UUID classroomId) {
        jdbcTemplate.queryForObject("SELECT fn_deactivate_classroom(?)", Object.class, classroomId);
    }

    @Override
    public void delete(UUID classroomId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_classroom(?)", Object.class, classroomId);
        } catch (org.springframework.dao.DataAccessException ex) {
            online.horarios_api.shared.domain.exception.ConflictException conflict =
                    online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private Classroom enrich(Classroom baseClassroom) {
        return new Classroom(
                baseClassroom.id(),
                baseClassroom.code(),
                baseClassroom.name(),
                baseClassroom.capacity(),
                baseClassroom.type(),
                baseClassroom.isActive(),
                loadAvailability(baseClassroom.id()),
                baseClassroom.createdAt(),
                baseClassroom.updatedAt()
        );
    }

    private List<AvailabilitySlot> loadAvailability(UUID classroomId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_classroom_availability(?)",
                (rs, rowNum) -> new AvailabilitySlot(
                        ScheduleDay.valueOf(rs.getString("day_of_week")),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime(),
                        rs.getBoolean("is_available")
                ),
                classroomId
        );
    }

    private void syncAvailability(UUID classroomId, List<AvailabilitySlot> availability) {
        jdbcTemplate.queryForObject("SELECT fn_clear_classroom_availability(?)", Object.class, classroomId);
        if (availability == null) {
            return;
        }
        for (AvailabilitySlot slot : availability) {
            jdbcTemplate.queryForObject(
                    "SELECT fn_set_classroom_availability(?, CAST(? AS day_of_week), ?, ?, ?)",
                    Object.class,
                    classroomId,
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
        if (message.contains("uq_classrooms_code")) {
            return new DuplicateFieldException("code", "El código de aula '" + code + "' ya está registrado.");
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
