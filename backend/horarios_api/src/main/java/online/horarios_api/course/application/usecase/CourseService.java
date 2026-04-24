package online.horarios_api.course.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.course.domain.port.in.CourseCommandUseCase;
import online.horarios_api.course.domain.port.in.CourseQueryUseCase;
import online.horarios_api.course.domain.port.out.CoursePort;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RequiredArgsConstructor
public class CourseService implements CourseCommandUseCase, CourseQueryUseCase {

    private final CoursePort coursePort;

    @Override
    @Transactional
    public Course createCourse(CourseData command) {
        return coursePort.create(normalize(command));
    }

    @Override
    @Transactional
    public Course updateCourse(UUID courseId, CourseData command) {
        ensureExists(courseId);
        return coursePort.update(courseId, normalize(command));
    }

    @Override
    @Transactional
    public void deactivateCourse(UUID courseId) {
        ensureExists(courseId);
        coursePort.deactivate(courseId);
    }

    @Override
    @Transactional
    public void deleteCourse(UUID courseId) {
        ensureExists(courseId);
        coursePort.delete(courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public Course getCourse(UUID courseId) {
        return ensureExists(courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Course> listCourses() {
        return coursePort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Course> searchCourses(String query) {
        if (query == null || query.isBlank()) {
            return coursePort.findAll();
        }
        return coursePort.searchByCodeOrName(query.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Course> listCoursesPaged(int page, int pageSize) {
        return coursePort.findAllPaged(page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Course> searchCoursesPaged(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return coursePort.findAllPaged(page, pageSize);
        }
        return coursePort.searchPaged(query.trim(), page, pageSize);
    }

    private Course ensureExists(UUID courseId) {
        return coursePort.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Curso no encontrado."));
    }

    private CourseData normalize(CourseData command) {
        String code = requireText(command.code(), "El código del curso es obligatorio.")
                .toUpperCase(Locale.ROOT);
        String name = requireText(command.name(), "El nombre del curso es obligatorio.");
        String roomType = normalizeNullable(command.requiredRoomType());

        if (command.credits() < 1 || command.credits() > 6) {
            throw new BadRequestException("Los créditos deben estar entre 1 y 6.");
        }
        if (command.weeklyHours() < 1) {
            throw new BadRequestException("Las horas semanales deben ser mayores o iguales a 1.");
        }

        List<String> prerequisites = command.prerequisites() == null
                ? List.of()
                : command.prerequisites().stream()
                .map(this::normalizeNullable)
                .filter(value -> value != null)
                .map(value -> value.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));

        if (prerequisites.contains(code)) {
            throw new BadRequestException("Un curso no puede ser prerrequisito de sí mismo.");
        }

        return new CourseData(
                code,
                name,
                command.credits(),
                command.weeklyHours(),
                roomType,
                command.isActive() == null ? Boolean.TRUE : command.isActive(),
                prerequisites
        );
    }

    private String requireText(String value, String message) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
