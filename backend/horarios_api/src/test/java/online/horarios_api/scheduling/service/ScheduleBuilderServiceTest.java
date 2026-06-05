package online.horarios_api.scheduling.service;

import online.horarios_api.scheduling.application.usecase.ScheduleBuilderService;
import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.port.out.ScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("ScheduleBuilderService")
class ScheduleBuilderServiceTest {

    private final ScheduleBuilderRepository repository = mock(ScheduleBuilderRepository.class);
    private final ScheduleBuilderService service = new ScheduleBuilderService(repository);

    @Test
    @DisplayName("addCourse: rechaza docente no asignado al componente")
    void addCourseRejectsTeacherWithoutComponent() {
        UUID scheduleId = UUID.randomUUID();
        UUID componentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        when(repository.teacherTeachesComponent(teacherId, componentId)).thenReturn(false);

        assertThatThrownBy(() -> service.addCourse(scheduleId, componentId, teacherId, null, List.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("docente seleccionado");

        verify(repository, never()).addCourse(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("addCourse: rechaza franjas fuera de disponibilidad del docente")
    void addCourseRejectsOutsideTeacherAvailability() {
        UUID scheduleId = UUID.randomUUID();
        UUID componentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID timeSlotId = UUID.randomUUID();
        SlotInput slot = new SlotInput(
                UUID.randomUUID(),
                timeSlotId,
                LocalTime.of(7, 0),
                LocalTime.of(8, 30)
        );

        when(repository.teacherTeachesComponent(teacherId, componentId)).thenReturn(true);
        when(repository.timeSlotIdsOutsideTeacherAvailability(teacherId, List.of(timeSlotId)))
                .thenReturn(List.of(timeSlotId));

        assertThatThrownBy(() -> service.addCourse(scheduleId, componentId, teacherId, null, List.of(slot)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no está disponible");

        verify(repository, never()).addCourse(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("addCourse: rechaza conflictos bloqueantes antes de persistir")
    void addCourseRejectsBlockingConflicts() {
        UUID scheduleId = UUID.randomUUID();
        UUID componentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID timeSlotId = UUID.randomUUID();
        SlotInput slot = new SlotInput(
                classroomId,
                timeSlotId,
                LocalTime.of(9, 0),
                LocalTime.of(10, 30)
        );

        when(repository.teacherTeachesComponent(teacherId, componentId)).thenReturn(true);
        when(repository.timeSlotIdsOutsideTeacherAvailability(teacherId, List.of(timeSlotId)))
                .thenReturn(List.of());
        when(repository.validateSlot(
                scheduleId,
                null,
                teacherId,
                classroomId,
                timeSlotId,
                slot.startTime(),
                slot.endTime(),
                null
        )).thenReturn(List.of(new SlotConflict("CLASSROOM_BUSY", classroomId, "Aula ocupada.")));

        assertThatThrownBy(() -> service.addCourse(scheduleId, componentId, teacherId, null, List.of(slot)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Aula ocupada");

        verify(repository, never()).addCourse(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("addCourse: payload válido se delega al repositorio")
    void addCourseDelegatesValidPayload() {
        UUID scheduleId = UUID.randomUUID();
        UUID componentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID sectionId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        SlotInput slot = new SlotInput(
                UUID.randomUUID(),
                UUID.randomUUID(),
                LocalTime.of(14, 0),
                LocalTime.of(15, 30)
        );

        when(repository.teacherTeachesComponent(teacherId, componentId)).thenReturn(true);
        when(repository.timeSlotIdsOutsideTeacherAvailability(teacherId, List.of(slot.timeSlotId())))
                .thenReturn(List.of());
        when(repository.validateSlot(
                eq(scheduleId),
                eq(null),
                eq(teacherId),
                eq(slot.classroomId()),
                eq(slot.timeSlotId()),
                eq(slot.startTime()),
                eq(slot.endTime()),
                eq(null)
        )).thenReturn(List.of());
        when(repository.addCourse(scheduleId, componentId, teacherId, sectionId, List.of(slot)))
                .thenReturn(assignmentId);

        UUID result = service.addCourse(scheduleId, componentId, teacherId, sectionId, List.of(slot));

        assertThat(result).isEqualTo(assignmentId);
        verify(repository).addCourse(scheduleId, componentId, teacherId, sectionId, List.of(slot));
    }

    @Test
    @DisplayName("validateSlot: datos incompletos lanzan BadRequestException")
    void validateSlotRejectsMissingData() {
        assertThatThrownBy(() -> service.validateSlot(
                UUID.randomUUID(),
                null,
                null,
                UUID.randomUUID(),
                UUID.randomUUID(),
                LocalTime.of(7, 0),
                LocalTime.of(8, 30),
                null
        )).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Faltan datos");
    }

    @Test
    @DisplayName("removeSlot: retorna resultado del repositorio")
    void removeSlotReturnsRepositoryResult() {
        UUID slotId = UUID.randomUUID();
        RemovedSlotResult removed = new RemovedSlotResult(
                UUID.randomUUID(),
                true,
                BigDecimal.valueOf(1.5),
                BigDecimal.valueOf(3)
        );
        when(repository.removeSlot(slotId)).thenReturn(removed);

        assertThat(service.removeSlot(slotId)).isEqualTo(removed);
    }
}
