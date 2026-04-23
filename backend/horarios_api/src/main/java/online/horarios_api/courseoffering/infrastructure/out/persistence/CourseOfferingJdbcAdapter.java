package online.horarios_api.courseoffering.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;
import online.horarios_api.courseoffering.domain.model.CourseSection;
import online.horarios_api.courseoffering.domain.model.CourseSectionData;
import online.horarios_api.courseoffering.domain.model.SectionTeacherCandidate;
import online.horarios_api.courseoffering.domain.port.out.CourseOfferingPort;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
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
public class CourseOfferingJdbcAdapter implements CourseOfferingPort {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<CourseOffering> baseMapper = (rs, rowNum) -> new CourseOffering(
            rs.getObject("id", UUID.class),
            rs.getObject("academic_period_id", UUID.class),
            rs.getObject("course_id", UUID.class),
            rs.getInt("expected_enrollment"),
            rs.getString("status"),
            List.of(),
            toInstant(rs, "created_at"),
            toInstant(rs, "updated_at")
    );

    @Override
    public CourseOffering create(CourseOfferingData command) {
        try {
            CourseOffering offering = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_create_course_offering(?, ?, ?, ?)",
                    baseMapper,
                    command.academicPeriodId(),
                    command.courseId(),
                    command.expectedEnrollment(),
                    command.status()
            );
            syncSections(offering.id(), command.sections());
            return findById(offering.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public CourseOffering update(UUID offeringId, CourseOfferingData command) {
        try {
            CourseOffering offering = jdbcTemplate.queryForObject(
                    "SELECT * FROM fn_update_course_offering(?, ?, ?, ?, ?)",
                    baseMapper,
                    offeringId,
                    command.academicPeriodId(),
                    command.courseId(),
                    command.expectedEnrollment(),
                    command.status()
            );
            syncSections(offeringId, command.sections());
            return findById(offering.id()).orElseThrow();
        } catch (DataAccessException ex) {
            throw mapException(ex);
        }
    }

    @Override
    public Optional<CourseOffering> findById(UUID offeringId) {
        List<CourseOffering> results = jdbcTemplate.query(
                "SELECT * FROM fn_get_course_offering_by_id(?)",
                baseMapper,
                offeringId
        );
        if (results.isEmpty() || results.getFirst().id() == null) {
            return Optional.empty();
        }
        return Optional.of(enrich(results.getFirst()));
    }

    @Override
    public List<CourseOffering> findAll() {
        return jdbcTemplate.query("SELECT * FROM fn_list_all_course_offerings()", baseMapper)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public List<CourseOffering> search(String query) {
        return jdbcTemplate.query("SELECT * FROM fn_search_course_offerings(?)", baseMapper, query)
                .stream()
                .map(this::enrich)
                .toList();
    }

    @Override
    public void cancel(UUID offeringId) {
        jdbcTemplate.queryForObject("SELECT fn_cancel_course_offering(?)", Object.class, offeringId);
    }

    @Override
    public void delete(UUID offeringId) {
        try {
            jdbcTemplate.queryForObject("SELECT fn_delete_course_offering(?)", Object.class, offeringId);
        } catch (org.springframework.dao.DataAccessException ex) {
            online.horarios_api.shared.domain.exception.ConflictException conflict =
                    online.horarios_api.shared.infrastructure.persistence.JdbcErrorMapper.mapForeignKeyBlock(ex);
            if (conflict != null) {
                throw conflict;
            }
            throw ex;
        }
    }

    private CourseOffering enrich(CourseOffering baseOffering) {
        return new CourseOffering(
                baseOffering.id(),
                baseOffering.academicPeriodId(),
                baseOffering.courseId(),
                baseOffering.expectedEnrollment(),
                baseOffering.status(),
                loadSections(baseOffering.id()),
                baseOffering.createdAt(),
                baseOffering.updatedAt()
        );
    }

    private List<CourseSection> loadSections(UUID offeringId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_course_sections(?)",
                (rs, rowNum) -> new CourseSection(
                        rs.getObject("id", UUID.class),
                        rs.getString("section_code"),
                        rs.getInt("vacancy_limit"),
                        rs.getString("status"),
                        loadCandidates(rs.getObject("id", UUID.class)),
                        toInstant(rs, "created_at"),
                        toInstant(rs, "updated_at")
                ),
                offeringId
        );
    }

    private List<SectionTeacherCandidate> loadCandidates(UUID sectionId) {
        return jdbcTemplate.query(
                "SELECT * FROM fn_list_section_teacher_candidates(?)",
                (rs, rowNum) -> new SectionTeacherCandidate(
                        rs.getObject("teacher_id", UUID.class),
                        rs.getBigDecimal("priority_weight").doubleValue()
                ),
                sectionId
        );
    }

    private void syncSections(UUID offeringId, List<CourseSectionData> sections) {
        jdbcTemplate.queryForObject("SELECT fn_clear_course_offering_sections(?)", Object.class, offeringId);
        if (sections == null) {
            return;
        }
        for (CourseSectionData section : sections) {
            UUID sectionId = jdbcTemplate.queryForObject(
                    "SELECT (fn_create_course_section(?, ?, ?, ?)).id",
                    UUID.class,
                    offeringId,
                    section.sectionCode(),
                    section.vacancyLimit(),
                    section.status()
            );
            if (section.teacherCandidates() == null) {
                continue;
            }
            for (SectionTeacherCandidate candidate : section.teacherCandidates()) {
                jdbcTemplate.queryForObject(
                        "SELECT fn_add_section_teacher_candidate(?, ?, ?)",
                        Object.class,
                        sectionId,
                        candidate.teacherId(),
                        candidate.priorityWeight()
                );
            }
        }
    }

    private RuntimeException mapException(DataAccessException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message = detail != null ? detail.toLowerCase() : "";
        if (message.contains("uq_course_offerings")) {
            return new DuplicateFieldException("courseId", "Ya existe una oferta para ese curso en el período indicado.");
        }
        if (message.contains("uq_course_sections")) {
            return new DuplicateFieldException("sectionCode", "El código de sección ya existe dentro de la oferta.");
        }
        return ex;
    }

    private Instant toInstant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) != null ? rs.getTimestamp(column).toInstant() : null;
    }
}
