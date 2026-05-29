package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.model.TimeSlot;
import online.horarios_api.scheduling.domain.port.in.ScheduleBuilderUseCase;
import online.horarios_api.scheduling.domain.port.out.ScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;

import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class ScheduleBuilderService implements ScheduleBuilderUseCase {

    private final ScheduleBuilderRepository repository;

    public ScheduleBuilderService(ScheduleBuilderRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<TimeSlot> listActiveTimeSlots() {
        return repository.listActiveTimeSlots();
    }

    @Override
    public List<ScheduleAssignment> listAssignments(UUID scheduleId) {
        if (scheduleId == null) {
            throw new BadRequestException("El horario es obligatorio.");
        }
        return repository.listAssignments(scheduleId);
    }

    @Override
    public UUID addCourse(UUID scheduleId,
                          UUID courseComponentId,
                          UUID teacherId,
                          UUID sectionId,
                          List<SlotInput> slots) {
        if (scheduleId == null || courseComponentId == null || teacherId == null) {
            throw new BadRequestException("Horario, componente y docente son obligatorios.");
        }

        if (!repository.teacherTeachesComponent(teacherId, courseComponentId)) {
            throw new BadRequestException(
                    "El docente seleccionado no tiene asignado este componente del curso.");
        }

        if (slots != null && !slots.isEmpty()) {
            List<UUID> timeSlotIds = slots.stream()
                    .map(SlotInput::timeSlotId)
                    .filter(Objects::nonNull)
                    .toList();
            List<UUID> outside = repository.timeSlotIdsOutsideTeacherAvailability(teacherId, timeSlotIds);
            if (!outside.isEmpty()) {
                throw new BadRequestException(
                        "El docente no está disponible en " + outside.size()
                                + " franja(s) seleccionada(s).");
            }

            // Bloquear si alguna franja ya está ocupada por otra asignación
            // (aula ocupada, docente ocupado o duplicado): evita sobrescribir.
            for (SlotInput slot : slots) {
                if (slot.classroomId() == null || slot.timeSlotId() == null
                        || slot.startTime() == null || slot.endTime() == null) {
                    continue;
                }
                List<SlotConflict> conflicts = repository.validateSlot(
                        scheduleId, null, teacherId,
                        slot.classroomId(), slot.timeSlotId(),
                        slot.startTime(), slot.endTime(), null);
                if (!conflicts.isEmpty()) {
                    String detail = conflicts.stream()
                            .map(SlotConflict::message)
                            .reduce((a, b) -> a + " · " + b)
                            .orElse("conflicto detectado");
                    throw new BadRequestException(
                            "Franja " + slot.startTime() + "-" + slot.endTime()
                                    + " no se puede asignar: " + detail);
                }
            }
        }

        return repository.addCourse(scheduleId, courseComponentId, teacherId, sectionId, slots);
    }

    @Override
    public UUID addSlot(UUID assignmentId, SlotInput slot) {
        if (assignmentId == null || slot == null) {
            throw new BadRequestException("La asignación y la franja son obligatorias.");
        }
        return repository.addSlot(assignmentId, slot);
    }

    @Override
    public RemovedSlotResult removeSlot(UUID slotId) {
        if (slotId == null) {
            throw new BadRequestException("La franja es obligatoria.");
        }
        return repository.removeSlot(slotId);
    }

    @Override
    public void removeAssignment(UUID assignmentId) {
        if (assignmentId == null) {
            throw new BadRequestException("La asignación es obligatoria.");
        }
        repository.removeAssignment(assignmentId);
    }

    @Override
    public List<SlotConflict> validateSlot(UUID scheduleId,
                                           UUID assignmentId,
                                           UUID teacherId,
                                           UUID classroomId,
                                           UUID timeSlotId,
                                           LocalTime startTime,
                                           LocalTime endTime,
                                           UUID excludeSlotId) {
        if (scheduleId == null || teacherId == null || classroomId == null
                || timeSlotId == null || startTime == null || endTime == null) {
            throw new BadRequestException("Faltan datos para validar la franja.");
        }
        return repository.validateSlot(scheduleId, assignmentId, teacherId,
                classroomId, timeSlotId, startTime, endTime, excludeSlotId);
    }
}
