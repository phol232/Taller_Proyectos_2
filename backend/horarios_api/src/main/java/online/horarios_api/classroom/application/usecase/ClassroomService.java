package online.horarios_api.classroom.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.classroom.domain.port.in.ClassroomCommandUseCase;
import online.horarios_api.classroom.domain.port.in.ClassroomQueryUseCase;
import online.horarios_api.classroom.domain.port.out.ClassroomPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.Page;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
public class ClassroomService implements ClassroomCommandUseCase, ClassroomQueryUseCase {

    private final ClassroomPort classroomPort;

    @Override
    @Transactional
    public Classroom createClassroom(ClassroomData command) {
        return classroomPort.create(normalize(command));
    }

    @Override
    @Transactional
    public Classroom updateClassroom(UUID classroomId, ClassroomData command) {
        ensureExists(classroomId);
        return classroomPort.update(classroomId, normalize(command));
    }

    @Override
    @Transactional
    public void deactivateClassroom(UUID classroomId) {
        ensureExists(classroomId);
        classroomPort.deactivate(classroomId);
    }

    @Override
    @Transactional
    public void deleteClassroom(UUID classroomId) {
        ensureExists(classroomId);
        classroomPort.delete(classroomId);
    }

    @Override
    @Transactional(readOnly = true)
    public Classroom getClassroom(UUID classroomId) {
        return ensureExists(classroomId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Classroom> listClassrooms() {
        return classroomPort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Classroom> searchClassrooms(String query) {
        if (query == null || query.isBlank()) {
            return classroomPort.findAll();
        }
        return classroomPort.searchByCodeOrName(query.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Classroom> listClassroomsPaged(int page, int pageSize) {
        return classroomPort.findAllPaged(page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Classroom> searchClassroomsPaged(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return classroomPort.findAllPaged(page, pageSize);
        }
        return classroomPort.searchPaged(query.trim(), page, pageSize);
    }

    private Classroom ensureExists(UUID classroomId) {
        return classroomPort.findById(classroomId)
                .orElseThrow(() -> new NotFoundException("Aula no encontrada."));
    }

    private ClassroomData normalize(ClassroomData command) {
        if (command.capacity() <= 0) {
            throw new BadRequestException("La capacidad del aula debe ser mayor a 0.");
        }
        return new ClassroomData(
                requireText(command.code(), "El código del aula es obligatorio.").toUpperCase(Locale.ROOT),
                requireText(command.name(), "El nombre del aula es obligatorio."),
                command.capacity(),
                requireText(command.type(), "El tipo de aula es obligatorio."),
                command.isActive() == null ? Boolean.TRUE : command.isActive(),
                normalizeAvailability(command.availability())
        );
    }

    private List<AvailabilitySlot> normalizeAvailability(List<AvailabilitySlot> availability) {
        if (availability == null || availability.isEmpty()) {
            return List.of();
        }
        Map<String, AvailabilitySlot> deduped = new LinkedHashMap<>();
        for (AvailabilitySlot slot : availability) {
            if (!slot.endTime().isAfter(slot.startTime())) {
                throw new BadRequestException("La franja horaria del aula es inválida.");
            }
            deduped.put(slot.day().name() + slot.startTime() + slot.endTime(), slot);
        }
        return List.copyOf(deduped.values());
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }
}
