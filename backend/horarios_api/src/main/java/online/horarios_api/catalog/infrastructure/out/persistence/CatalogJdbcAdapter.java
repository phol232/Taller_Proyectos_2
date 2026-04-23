package online.horarios_api.catalog.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;
import online.horarios_api.catalog.domain.port.out.CatalogPort;
import online.horarios_api.shared.domain.exception.ConflictException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CatalogJdbcAdapter implements CatalogPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Facultad> facultadMapper = (rs, rowNum) -> new Facultad(
            rs.getObject("id", UUID.class),
            rs.getString("code"),
            rs.getString("name"),
            rs.getBoolean("is_active"),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    private final RowMapper<Carrera> carreraMapper = (rs, rowNum) -> new Carrera(
            rs.getObject("id", UUID.class),
            rs.getObject("facultad_id", UUID.class),
            rs.getString("code"),
            rs.getString("name"),
            rs.getBoolean("is_active"),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    // ─── Lectura pública (solo activas) ─────────────────────────────

    @Override
    public List<Facultad> listFacultades() {
        return jdbcTemplate.query("SELECT * FROM fn_list_facultades()", facultadMapper);
    }

    @Override
    public List<Carrera> listCarreras() {
        return jdbcTemplate.query("SELECT * FROM fn_list_carreras()", carreraMapper);
    }

    @Override
    public List<Carrera> listCarrerasByFacultad(UUID facultadId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_carreras_by_facultad(?)",
                carreraMapper,
                facultadId
        );
    }

    // ─── Lectura admin (incluye inactivas) ──────────────────────────

    @Override
    public List<Facultad> listAllFacultades() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_facultades()", facultadMapper);
    }

    @Override
    public List<Carrera> listAllCarrerasByFacultad(UUID facultadId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_all_carreras_by_facultad(?)",
                carreraMapper,
                facultadId
        );
    }

    // ─── Facultades ─────────────────────────────────────────────────

    @Override
    public Facultad createFacultad(String code, String name) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_facultad(?, ?)",
                    facultadMapper,
                    code,
                    name
            );
        } catch (DataAccessException ex) {
            throw mapFacultadException(ex, code);
        }
    }

    @Override
    public Facultad updateFacultad(UUID id, String code, String name, boolean isActive) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_facultad(?, ?, ?, ?)",
                    facultadMapper,
                    id,
                    code,
                    name,
                    isActive
            );
        } catch (DataAccessException ex) {
            throw mapFacultadException(ex, code);
        }
    }

    @Override
    public void deactivateFacultad(UUID id) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_deactivate_facultad(?)", Object.class, id);
        } catch (DataAccessException ex) {
            NotFoundException nf = mapNotFound(ex, "Facultad");
            throw nf != null ? nf : ex;
        }
    }

    @Override
    public void deleteFacultad(UUID id) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_facultad(?)", Object.class, id);
        } catch (DataAccessException ex) {
            ConflictException conflict = JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            NotFoundException nf = mapNotFound(ex, "Facultad");
            throw nf != null ? nf : ex;
        }
    }

    // ─── Carreras ───────────────────────────────────────────────────

    @Override
    public Carrera createCarrera(UUID facultadId, String code, String name) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_carrera(?, ?, ?)",
                    carreraMapper,
                    facultadId,
                    code,
                    name
            );
        } catch (DataAccessException ex) {
            throw mapCarreraException(ex, code);
        }
    }

    @Override
    public Carrera updateCarrera(UUID id, UUID facultadId, String code, String name, boolean isActive) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_carrera(?, ?, ?, ?, ?)",
                    carreraMapper,
                    id,
                    facultadId,
                    code,
                    name,
                    isActive
            );
        } catch (DataAccessException ex) {
            throw mapCarreraException(ex, code);
        }
    }

    @Override
    public void deactivateCarrera(UUID id) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_deactivate_carrera(?)", Object.class, id);
        } catch (DataAccessException ex) {
            NotFoundException nf = mapNotFound(ex, "Carrera");
            throw nf != null ? nf : ex;
        }
    }

    @Override
    public void deleteCarrera(UUID id) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_carrera(?)", Object.class, id);
        } catch (DataAccessException ex) {
            ConflictException conflict = JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            NotFoundException nf = mapNotFound(ex, "Carrera");
            throw nf != null ? nf : ex;
        }
    }

    // ─── Mapeo de errores ───────────────────────────────────────────

    private RuntimeException mapFacultadException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_facultades_code")) {
            return new DuplicateFieldException(
                    "code",
                    "El código de facultad '" + code + "' ya está registrado."
            );
        }
        NotFoundException nf = mapNotFound(ex, "Facultad");
        return nf != null ? nf : ex;
    }

    private RuntimeException mapCarreraException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_carreras_code")) {
            return new DuplicateFieldException(
                    "code",
                    "El código de carrera '" + code + "' ya está registrado."
            );
        }
        NotFoundException nf = mapNotFound(ex, "Carrera");
        return nf != null ? nf : ex;
    }

    private NotFoundException mapNotFound(DataAccessException ex, String entity) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("no encontrada") || message.contains("no encontrado")) {
            return new NotFoundException(entity + " no encontrada.");
        }
        return null;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
