package online.horarios_api.courseoffering.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.courseoffering.domain.model.CourseOffering;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;
import online.horarios_api.courseoffering.domain.model.CourseSectionData;
import online.horarios_api.courseoffering.domain.model.SectionTeacherCandidate;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingCommandUseCase;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingQueryUseCase;
import online.horarios_api.courseoffering.domain.port.out.CourseOfferingPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RequiredArgsConstructor
public class CourseOfferingService implements CourseOfferingCommandUseCase, CourseOfferingQueryUseCase {

    private static final Set<String> ALLOWED_STATUSES = Set.of("DRAFT", "ACTIVE", "CANCELLED");

    private final CourseOfferingPort courseOfferingPort;

    @Override
    @Transactional
    public CourseOffering createCourseOffering(CourseOfferingData command) {
        return courseOfferingPort.create(normalize(command));
    }

    @Override
    @Transactional
    public CourseOffering updateCourseOffering(UUID offeringId, CourseOfferingData command) {
        ensureExists(offeringId);
        return courseOfferingPort.update(offeringId, normalize(command));
    }

    @Override
    @Transactional
    public void cancelCourseOffering(UUID offeringId) {
        ensureExists(offeringId);
        courseOfferingPort.cancel(offeringId);
    }

    @Override
    @Transactional
    public void deleteCourseOffering(UUID offeringId) {
        ensureExists(offeringId);
        courseOfferingPort.delete(offeringId);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseOffering getCourseOffering(UUID offeringId) {
        return ensureExists(offeringId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseOffering> listCourseOfferings() {
        return courseOfferingPort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseOffering> searchCourseOfferings(String query) {
        if (query == null || query.isBlank()) {
            return courseOfferingPort.findAll();
        }
        return courseOfferingPort.search(query.trim());
    }

    private CourseOffering ensureExists(UUID offeringId) {
        return courseOfferingPort.findById(offeringId)
                .orElseThrow(() -> new NotFoundException("Oferta de curso no encontrada."));
    }

    private CourseOfferingData normalize(CourseOfferingData command) {
        if (command.academicPeriodId() == null) {
            throw new BadRequestException("El período académico es obligatorio.");
        }
        if (command.courseId() == null) {
            throw new BadRequestException("El curso es obligatorio.");
        }
        if (command.expectedEnrollment() < 0) {
            throw new BadRequestException("La matrícula esperada no puede ser negativa.");
        }
        String status = normalizeStatus(command.status());
        List<CourseSectionData> sections = normalizeSections(command.sections());
        return new CourseOfferingData(
                command.academicPeriodId(),
                command.courseId(),
                command.expectedEnrollment(),
                status,
                sections
        );
    }

    private List<CourseSectionData> normalizeSections(List<CourseSectionData> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        Map<String, CourseSectionData> deduped = new LinkedHashMap<>();
        for (CourseSectionData section : sections) {
            if (section.vacancyLimit() <= 0) {
                throw new BadRequestException("La vacante de la sección debe ser mayor a 0.");
            }
            String code = requireText(section.sectionCode(), "El código de sección es obligatorio.")
                    .toUpperCase(Locale.ROOT);
            List<SectionTeacherCandidate> candidates = normalizeCandidates(section.teacherCandidates());
            deduped.put(code, new CourseSectionData(code, section.vacancyLimit(), normalizeStatus(section.status()), candidates));
        }
        return List.copyOf(deduped.values());
    }

    private List<SectionTeacherCandidate> normalizeCandidates(List<SectionTeacherCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }
        Map<UUID, SectionTeacherCandidate> deduped = new LinkedHashMap<>();
        for (SectionTeacherCandidate candidate : candidates) {
            if (candidate.teacherId() == null) {
                throw new BadRequestException("El docente candidato es obligatorio.");
            }
            if (candidate.priorityWeight() < 0) {
                throw new BadRequestException("La prioridad del docente no puede ser negativa.");
            }
            deduped.put(candidate.teacherId(), candidate);
        }
        return List.copyOf(deduped.values());
    }

    private String normalizeStatus(String status) {
        String normalized = requireText(status, "El estado es obligatorio.").toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new BadRequestException("El estado no es válido.");
        }
        return normalized;
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }
}
