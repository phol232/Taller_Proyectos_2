package online.horarios_api.course.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.course.domain.port.out.CoursePort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.Page;
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
public class CourseJdbcAdapter implements CoursePort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Course> baseMapper = (rs, rowNum) -> new Course(
            rs.getObject("id", UUID.class),
            rs.getString("code"),
            rs.getString("name"),
            rs.getInt("cycle"),
            rs.getInt("credits"),
            rs.getInt("required_credits"),
            rs.getInt("weekly_hours"),
            rs.getString("required_room_type"),
            rs.getBoolean("is_active"),
            List.of(),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    @Override
    public Course create(CourseData command) {
        try {
            Course created = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_course(?, ?, ?, ?, ?, ?, ?, ?)",
                    baseMapper,
                    command.code(),
                    command.name(),
                    command.cycle(),
                    command.credits(),
                    command.requiredCredits(),
                    command.weeklyHours(),
                    command.requiredRoomType(),
                    command.isActive()
            );
            syncPrerequisites(created.id(), command.prerequisites());
            return findById(created.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Course update(UUID courseId, CourseData command) {
        try {
            Course updated = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_course(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    baseMapper,
                    courseId,
                    command.code(),
                    command.name(),
                    command.cycle(),
                    command.credits(),
                    command.requiredCredits(),
                    command.weeklyHours(),
                    command.requiredRoomType(),
                    command.isActive()
            );
            syncPrerequisites(courseId, command.prerequisites());
            return findById(updated.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex, command.code());
        }
    }

    @Override
    public Optional<Course> findById(UUID courseId) {
        List<Course> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_course_by_id(?)",
                baseMapper,
                courseId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public List<Course> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_courses()", baseMapper)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<Course> searchByCodeOrName(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_courses(?)", baseMapper, query)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<Course> findByCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return List.of();
        }
        String[] codeArray = codes.toArray(new String[0]);
        List<Course> raw = jdbcTemplate.query(
                "SELECT * FROM fn_find_courses_by_codes(?)",
                ps -> ps.setArray(1, ps.getConnection().createArrayOf("varchar", codeArray)),
                baseMapper
        );
        return raw.stream().map(this::enrich).toList();
    }

    @Override
    public Page<Course> findAllPaged(int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        long[] total = {0L};
        List<Course> raw = jdbcTemplate.query(
                "SELECT * FROM fn_list_courses_paged(?, ?)",
                (rs, rowNum) -> {
                    if (rowNum == 0) total[0] = rs.getLong("total_count");
                    return baseMapper.mapRow(rs, rowNum);
                },
                safePage, safeSize
        );
        long totalCount = raw.isEmpty() ? 0L : total[0];
        List<Course> enriched = raw.stream().map(this::enrich).toList();
        return Page.of(enriched, safePage, safeSize, totalCount);
    }

    @Override
    public Page<Course> searchPaged(String query, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, pageSize);
        long[] total = {0L};
        List<Course> raw = jdbcTemplate.query(
                "SELECT * FROM fn_search_courses_paged(?, ?, ?)",
                (rs, rowNum) -> {
                    if (rowNum == 0) total[0] = rs.getLong("total_count");
                    return baseMapper.mapRow(rs, rowNum);
                },
                query, safePage, safeSize
        );
        long totalCount = raw.isEmpty() ? 0L : total[0];
        List<Course> enriched = raw.stream().map(this::enrich).toList();
        return Page.of(enriched, safePage, safeSize, totalCount);
    }

    @Override
    public void deactivate(UUID courseId) {
        jdbcTemplate.queryForObject("SELECT fn_deactivate_course(?)", Object.class, courseId);
    }

    @Override
    public void delete(UUID courseId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_course(?)", Object.class, courseId);
        } catch (org.springframework.dao.DataAccessException ex) {
            online.horarios_api.shared.domain.exception.ConflictException conflict =
                    online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private Course enrich(Course baseCourse) {
        return new Course(
                baseCourse.id(),
                baseCourse.code(),
                baseCourse.name(),
                baseCourse.cycle(),
                baseCourse.credits(),
                baseCourse.requiredCredits(),
                baseCourse.weeklyHours(),
                baseCourse.requiredRoomType(),
                baseCourse.isActive(),
                loadPrerequisites(baseCourse.id()),
                baseCourse.createdAt(),
                baseCourse.updatedAt()
        );
    }

    private List<String> loadPrerequisites(UUID courseId) {
        return jdbcTemplate.query(
                "SELECT prerequisite_code FROM fn_list_course_prerequisite_codes(?)",
                (rs, rowNum) -> rs.getString("prerequisite_code"),
                courseId
        );
    }

    private void syncPrerequisites(UUID courseId, List<String> prerequisites) {
        jdbcTemplate.queryForObject("SELECT fn_clear_course_prerequisites(?)", Object.class, courseId);
        if (prerequisites == null) {
            return;
        }
        for (String prerequisite : prerequisites) {
            jdbcTemplate.queryForObject(
                    "SELECT fn_add_course_prerequisite_by_code(?, ?)",
                    Object.class,
                    courseId,
                    prerequisite
            );
        }
    }

    private RuntimeException mapException(DataAccessException ex, String code) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_courses_code")) {
            return new DuplicateFieldException("code", "El código de curso '" + code + "' ya está registrado.");
        }
        if (message.contains("prerrequisito")) {
            return new BadRequestException(ex.getMostSpecificCause().getMessage());
        }
        return ex;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
