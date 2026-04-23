package online.horarios_api.academicperiod.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;
import online.horarios_api.academicperiod.domain.port.out.AcademicPeriodPort;
import online.horarios_api.shared.domain.exception.ConflictException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper;
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
public class AcademicPeriodJdbcAdapter implements AcademicPeriodPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<AcademicPeriod> rowMapper = (rs, rowNum) -> new AcademicPeriod(
            rs.getObject("id", UUID.class),
            rs.getString("code"),
            rs.getString("name"),
            rs.getDate("starts_at").toLocalDate(),
            rs.getDate("ends_at").toLocalDate(),
            rs.getString("status"),
            rs.getInt("max_student_credits"),
            rs.getBoolean("is_active"),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    @Override
    public AcademicPeriod create(AcademicPeriodData command) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_academic_period(?, ?, ?, ?, ?, ?)",
                    rowMapper,
                    command.code(),
                    command.name(),
                    command.startsAt(),
                    command.endsAt(),
                    command.status(),
                    command.maxStudentCredits()
            );
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public AcademicPeriod update(UUID periodId, AcademicPeriodData command) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_academic_period(?, ?, ?, ?, ?, ?, ?)",
                    rowMapper,
                    periodId,
                    command.code(),
                    command.name(),
                    command.startsAt(),
                    command.endsAt(),
                    command.status(),
                    command.maxStudentCredits()
            );
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Optional<AcademicPeriod> findById(UUID periodId) {
        List<AcademicPeriod> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_academic_period_by_id(?)",
                rowMapper,
                periodId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(results.getFirst());
    }

    @Override
    public List<AcademicPeriod> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_academic_periods()", rowMapper);
    }

    @Override
    public List<AcademicPeriod> search(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_academic_periods(?)", rowMapper, query);
    }

    @Override
    public void deactivate(UUID periodId) {
        jdbcTemplate.queryForObject("SELECT fn_deactivate_academic_period(?)", Object.class, periodId);
    }

    @Override
    public void delete(UUID periodId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_academic_period(?)", Object.class, periodId);
        } catch (DataAccessException ex) {
            ConflictException conflict = JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private RuntimeException mapException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_academic_periods_code")) {
            return new DuplicateFieldException("code", "El código de período '" + code + "' ya está registrado.");
        }
        return ex;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
