package online.horarios_api.student.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;
import online.horarios_api.student.domain.port.out.StudentPort;
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
public class StudentJdbcAdapter implements StudentPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Student> baseMapper = (rs, rowNum) -> new Student(
            rs.getObject("id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("code"),
            rs.getString("full_name"),
            rs.getInt("cycle"),
            rs.getString("career"),
            rs.getInt("credit_limit"),
            rs.getBoolean("is_active"),
            rs.getObject("facultad_id", UUID.class),
            rs.getObject("carrera_id", UUID.class),
            rs.getString("email"),
            List.of(),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    private final RowMapper<UUID> idMapper = (rs, rowNum) -> rs.getObject("id", UUID.class);

    @Override
    public Student create(StudentData command) {
        try {
            UUID createdId = jdbcTemplate.queryForObject(
                    "SELECT id FROM fn_create_student(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    idMapper,
                    command.userId(),
                    command.code(),
                    command.fullName(),
                    command.cycle(),
                    command.career(),
                    command.creditLimit(),
                    command.isActive(),
                    command.facultadId(),
                    command.carreraId()
            );
            syncApprovedCourses(createdId, command.approvedCourses());
            return findById(createdId).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Student update(UUID studentId, StudentData command) {
        try {
            UUID updatedId = jdbcTemplate.queryForObject(
                    "SELECT id FROM fn_update_student(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    idMapper,
                    studentId,
                    command.userId(),
                    command.code(),
                    command.fullName(),
                    command.cycle(),
                    command.career(),
                    command.creditLimit(),
                    command.isActive(),
                    command.facultadId(),
                    command.carreraId()
            );
            syncApprovedCourses(updatedId, command.approvedCourses());
            return findById(updatedId).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Optional<Student> findById(UUID studentId) {
        List<Student> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_student_by_id(?)",
                baseMapper,
                studentId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public Optional<Student> findByUserId(UUID userId) {
        List<Student> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_student_by_user_id(?)",
                baseMapper,
                userId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public List<Student> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_students()", baseMapper)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<Student> searchByCodeOrName(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_students(?)", baseMapper, query)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public void deactivate(UUID studentId) {
        jdbcTemplate.queryForObject("SELECT fn_deactivate_student(?)", Object.class, studentId);
    }

    @Override
    public void delete(UUID studentId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_student(?)", Object.class, studentId);
        } catch (org.springframework.dao.DataAccessException ex) {
            online.horarios_api.shared.domain.exception.ConflictException conflict =
                    online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private Student enrich(Student baseStudent) {
        return new Student(
                baseStudent.id(),
                baseStudent.userId(),
                baseStudent.code(),
                baseStudent.fullName(),
                baseStudent.cycle(),
                baseStudent.career(),
                baseStudent.creditLimit(),
                baseStudent.isActive(),
                baseStudent.facultadId(),
                baseStudent.carreraId(),
                baseStudent.email(),
                loadApprovedCourses(baseStudent.id()),
                baseStudent.createdAt(),
                baseStudent.updatedAt()
        );
    }

    private List<String> loadApprovedCourses(UUID studentId) {
        return jdbcTemplate.query(
                "SELECT course_code FROM fn_list_student_completed_course_codes(?)",
                (rs, rowNum) -> rs.getString("course_code"),
                studentId
        );
    }

    private void syncApprovedCourses(UUID studentId, List<String> approvedCourses) {
        jdbcTemplate.queryForObject("SELECT fn_clear_student_completed_courses(?)", Object.class, studentId);
        if (approvedCourses == null) {
            return;
        }
        for (String courseCode : approvedCourses) {
            jdbcTemplate.queryForObject(
                    "SELECT fn_add_student_completed_course_by_code(?, ?)",
                    Object.class,
                    studentId,
                    courseCode
            );
        }
    }

    private RuntimeException mapException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_students_code")) {
            return new DuplicateFieldException("code", "El código de estudiante '" + code + "' ya está registrado.");
        }
        if (message.contains("uq_students_user_id")) {
            return new DuplicateFieldException("userId", "El usuario ya está vinculado a otro estudiante.");
        }
        if (message.contains("curso aprobado")) {
            return new BadRequestException(ex.getMostSpecificCause().getMessage());
        }
        return ex;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
