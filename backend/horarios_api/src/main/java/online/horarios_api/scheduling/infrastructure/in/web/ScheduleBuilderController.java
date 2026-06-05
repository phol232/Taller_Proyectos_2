package online.horarios_api.scheduling.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.application.dto.RemovedSlotResponse;
import online.horarios_api.scheduling.application.dto.ScheduleAssignmentResponse;
import online.horarios_api.scheduling.application.dto.SlotConflictResponse;
import online.horarios_api.scheduling.application.dto.TimeSlotResponse;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.port.in.ScheduleBuilderUseCase;
import online.horarios_api.scheduling.infrastructure.in.web.dto.AddCourseAssignmentRequest;
import online.horarios_api.scheduling.infrastructure.in.web.dto.SlotInputRequest;
import online.horarios_api.scheduling.infrastructure.in.web.dto.ValidateSlotRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Constructor de horarios", description = "Edición manual de un horario docente")
public class ScheduleBuilderController {

    private final ScheduleBuilderUseCase scheduleBuilderUseCase;

    @GetMapping("/time-slots")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Listar franjas horarias activas")
    public ResponseEntity<List<TimeSlotResponse>> listTimeSlots() {
        List<TimeSlotResponse> slots = scheduleBuilderUseCase.listActiveTimeSlots().stream()
                .map(ts -> new TimeSlotResponse(
                        ts.id(),
                        ts.dayOfWeek(),
                        ts.startTime().toString(),
                        ts.endTime().toString(),
                        ts.slotOrder()
                ))
                .toList();
        return ResponseEntity.ok(slots);
    }

    @GetMapping("/{scheduleId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Listar asignaciones del horario con sus franjas")
    public ResponseEntity<List<ScheduleAssignmentResponse>> listAssignments(
            @PathVariable UUID scheduleId
    ) {
        List<ScheduleAssignmentResponse> response = scheduleBuilderUseCase
                .listAssignments(scheduleId)
                .stream()
                .map(ScheduleAssignmentResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{scheduleId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Agregar un curso/componente al horario")
    public ResponseEntity<Map<String, UUID>> addAssignment(
            @PathVariable UUID scheduleId,
            @Valid @RequestBody AddCourseAssignmentRequest request
    ) {
        List<SlotInput> slots = request.slots() == null
                ? List.of()
                : request.slots().stream()
                        .map(s -> new SlotInput(s.classroomId(), s.timeSlotId(), s.startTime(), s.endTime()))
                        .toList();
        UUID assignmentId = scheduleBuilderUseCase.addCourse(
                scheduleId,
                request.courseComponentId(),
                request.teacherId(),
                request.sectionId(),
                slots
        );
        return ResponseEntity.ok(Map.of("assignmentId", assignmentId));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Eliminar una asignación completa (y sus franjas)")
    public ResponseEntity<Void> removeAssignment(@PathVariable UUID assignmentId) {
        scheduleBuilderUseCase.removeAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/assignments/{assignmentId}/slots")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Agregar una franja a una asignación existente")
    public ResponseEntity<Map<String, UUID>> addSlot(
            @PathVariable UUID assignmentId,
            @Valid @RequestBody SlotInputRequest request
    ) {
        SlotInput slot = new SlotInput(
                request.classroomId(), request.timeSlotId(),
                request.startTime(), request.endTime()
        );
        UUID slotId = scheduleBuilderUseCase.addSlot(assignmentId, slot);
        return ResponseEntity.ok(Map.of("slotId", slotId));
    }

    @DeleteMapping("/slots/{slotId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Eliminar una franja")
    public ResponseEntity<RemovedSlotResponse> removeSlot(@PathVariable UUID slotId) {
        return ResponseEntity.ok(RemovedSlotResponse.from(scheduleBuilderUseCase.removeSlot(slotId)));
    }

    @PostMapping("/{scheduleId}/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Validar conflictos de una franja antes de agregarla")
    public ResponseEntity<List<SlotConflictResponse>> validateSlot(
            @PathVariable UUID scheduleId,
            @Valid @RequestBody ValidateSlotRequest request
    ) {
        List<SlotConflictResponse> response = scheduleBuilderUseCase
                .validateSlot(
                        scheduleId,
                        request.assignmentId(),
                        request.teacherId(),
                        request.classroomId(),
                        request.timeSlotId(),
                        request.startTime(),
                        request.endTime(),
                        request.excludeSlotId()
                )
                .stream()
                .map(SlotConflictResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }
}
