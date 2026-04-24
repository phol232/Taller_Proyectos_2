package online.horarios_api.teacher.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;
import online.horarios_api.teacher.domain.port.in.TeacherCommandUseCase;
import online.horarios_api.teacher.domain.port.in.TeacherQueryUseCase;
import online.horarios_api.teacher.domain.port.out.TeacherPort;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
public class TeacherService implements TeacherCommandUseCase, TeacherQueryUseCase {

    private final TeacherPort teacherPort;

    @Override
    @Transactional
    public Teacher createTeacher(TeacherData command) {
        return teacherPort.create(normalize(command));
    }

    @Override
    @Transactional
    public Teacher updateTeacher(UUID teacherId, TeacherData command) {
        ensureExists(teacherId);
        return teacherPort.update(teacherId, normalize(command));
    }

    @Override
    @Transactional
    public void deactivateTeacher(UUID teacherId) {
        ensureExists(teacherId);
        teacherPort.deactivate(teacherId);
    }

    @Override
    @Transactional
    public void deleteTeacher(UUID teacherId) {
        ensureExists(teacherId);
        teacherPort.delete(teacherId);
    }

    @Override
    @Transactional(readOnly = true)
    public Teacher getTeacher(UUID teacherId) {
        return ensureExists(teacherId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Teacher> listTeachers() {
        return teacherPort.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Teacher> searchTeachers(String query) {
        if (query == null || query.isBlank()) {
            return teacherPort.findAll();
        }
        return teacherPort.searchByCodeOrName(query.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Teacher> listTeachersPaged(int page, int pageSize) {
        return teacherPort.findAllPaged(page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Teacher> searchTeachersPaged(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return teacherPort.findAllPaged(page, pageSize);
        }
        return teacherPort.searchPaged(query.trim(), page, pageSize);
    }

    private Teacher ensureExists(UUID teacherId) {
        return teacherPort.findById(teacherId)
                .orElseThrow(() -> new NotFoundException("Docente no encontrado."));
    }

    private TeacherData normalize(TeacherData command) {
        List<AvailabilitySlot> availability = normalizeAvailability(command.availability());
        return new TeacherData(
                command.userId(),
                requireText(command.code(), "El código del docente es obligatorio.").toUpperCase(Locale.ROOT),
                requireText(command.fullName(), "El nombre del docente es obligatorio."),
                requireText(command.specialty(), "La especialidad del docente es obligatoria."),
                command.isActive() == null ? Boolean.TRUE : command.isActive(),
                availability
        );
    }

    private List<AvailabilitySlot> normalizeAvailability(List<AvailabilitySlot> availability) {
        if (availability == null || availability.isEmpty()) {
            return List.of();
        }
        Map<String, AvailabilitySlot> deduped = new LinkedHashMap<>();
        for (AvailabilitySlot slot : availability) {
            if (!slot.endTime().isAfter(slot.startTime())) {
                throw new BadRequestException("La franja horaria del docente es inválida.");
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


