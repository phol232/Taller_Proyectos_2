package online.horarios_api.course.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseComponentData;
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
import java.util.concurrent.atomic.AtomicInteger;

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
    public List<Course> findCoursesByCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return List.of();
        }
        List<String> normalized = codes.stream()
                .filter(c -> c != null && !c.isBlank())
                .map(c -> c.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return coursePort.findByCodes(normalized);
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
        String roomType = requireText(command.requiredRoomType(), "El tipo de aula requerido es obligatorio.");

        if (command.credits() < 1 || command.credits() > 6) {
            throw new BadRequestException("Los créditos deben estar entre 1 y 6.");
        }
        int cycle = command.cycle() == null ? 1 : command.cycle();
        if (cycle < 1 || cycle > 10) {
            throw new BadRequestException("El ciclo debe estar entre 1 y 10.");
        }
        int requiredCredits = command.requiredCredits() == null ? 0 : command.requiredCredits();
        if (requiredCredits < 0) {
            throw new BadRequestException("Los créditos requeridos no pueden ser negativos.");
        }
        if (command.weeklyHours() < 1) {
            throw new BadRequestException("Las horas semanales deben ser mayores o iguales a 1.");
        }

        List<CourseComponentData> components = normalizeComponents(
                command.components(),
                command.weeklyHours(),
                roomType
        );

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
                cycle,
                command.credits(),
                requiredCredits,
                command.weeklyHours(),
                roomType,
                command.isActive() == null ? Boolean.TRUE : command.isActive(),
                components,
                prerequisites
        );
    }

    private List<CourseComponentData> normalizeComponents(
            List<CourseComponentData> components,
            int courseWeeklyHours,
            String fallbackRoomType
    ) {
        if (components == null || components.isEmpty()) {
            return List.of(new CourseComponentData(
                    "GENERAL",
                    courseWeeklyHours,
                    fallbackRoomType,
                    1,
                    Boolean.TRUE
            ));
        }

        AtomicInteger nextOrder = new AtomicInteger(1);
        List<CourseComponentData> normalized = components.stream()
                .map(component -> normalizeComponent(component, fallbackRoomType, nextOrder.getAndIncrement()))
                .toList();

        long generalCount = normalized.stream()
                .filter(component -> "GENERAL".equals(component.componentType()))
                .count();
        long specificCount = normalized.stream()
                .filter(component -> !"GENERAL".equals(component.componentType()))
                .count();
        if (generalCount > 0 && specificCount > 0) {
            throw new BadRequestException("No se puede mezclar un componente general con teoría/práctica.");
        }
        if (generalCount > 1) {
            throw new BadRequestException("Un curso solo puede tener un componente general.");
        }

        // Nota: no se valida que la suma de horas de componentes coincida con courseWeeklyHours —
        // ambos se gestionan de forma independiente (formulario curso vs modal Horarios).

        List<String> componentTypes = normalized.stream().map(CourseComponentData::componentType).toList();
        if (new LinkedHashSet<>(componentTypes).size() != componentTypes.size()) {
            throw new BadRequestException("No se pueden repetir tipos de componente en un mismo curso.");
        }

        List<Integer> sortOrders = normalized.stream().map(CourseComponentData::sortOrder).toList();
        if (new LinkedHashSet<>(sortOrders).size() != sortOrders.size()) {
            throw new BadRequestException("No se pueden repetir órdenes de componente en un mismo curso.");
        }

        return normalized;
    }

    private CourseComponentData normalizeComponent(
            CourseComponentData component,
            String fallbackRoomType,
            int fallbackSortOrder
    ) {
        String type = requireText(component.componentType(), "El tipo de componente es obligatorio.")
                .toUpperCase(Locale.ROOT);
        if (!List.of("GENERAL", "THEORY", "PRACTICE").contains(type)) {
            throw new BadRequestException("El tipo de componente debe ser GENERAL, THEORY o PRACTICE.");
        }
        if (component.weeklyHours() < 1) {
            throw new BadRequestException("Las horas del componente deben ser mayores o iguales a 1.");
        }
        String componentRoomType = normalizeNullable(component.requiredRoomType());
        if (componentRoomType == null) {
            componentRoomType = fallbackRoomType;
        }
        int sortOrder = component.sortOrder() == null ? fallbackSortOrder : component.sortOrder();
        if (sortOrder < 1) {
            throw new BadRequestException("El orden del componente debe ser mayor o igual a 1.");
        }
        return new CourseComponentData(
                type,
                component.weeklyHours(),
                componentRoomType,
                sortOrder,
                component.isActive() == null ? Boolean.TRUE : component.isActive()
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
