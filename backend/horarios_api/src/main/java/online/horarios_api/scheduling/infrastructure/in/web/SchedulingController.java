package online.horarios_api.scheduling.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.application.dto.ConfirmScheduleResponse;
import online.horarios_api.scheduling.application.dto.CourseSectionResponse;
import online.horarios_api.scheduling.application.dto.ScheduleGenerationRunResponse;
import online.horarios_api.scheduling.application.dto.ScheduleGenerationResponse;
import online.horarios_api.scheduling.application.dto.ScheduleOptionResponse;
import online.horarios_api.scheduling.application.dto.TimetableSlotResponse;
import online.horarios_api.scheduling.domain.port.in.ListCourseSectionsUseCase;
import online.horarios_api.scheduling.domain.port.in.ScheduleGenerationUseCase;
import online.horarios_api.scheduling.domain.port.out.TimetableRepository;
import online.horarios_api.scheduling.infrastructure.in.web.dto.ScheduleGenerationRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Horarios", description = "Consulta de secciones y NRC de horarios docentes")
public class SchedulingController {

    private final ListCourseSectionsUseCase listCourseSectionsUseCase;
    private final ScheduleGenerationUseCase scheduleGenerationUseCase;
    private final TimetableRepository timetableRepository;

    @PostMapping("/generations")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(
            summary = "Generar una opción de horario docente",
            description = "Crea una sola generación por request y la guarda como borrador en el solver."
    )
    public ResponseEntity<ScheduleGenerationResponse> generateOption(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ScheduleGenerationRequest request
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        ScheduleGenerationResponse response = ScheduleGenerationResponse.from(
                scheduleGenerationUseCase.generateOption(
                        actorId,
                        request.academicPeriodId(),
                        request.classroomIds(),
                        request.timeLimitMs()
                )
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/options")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Listar opciones borrador de un período académico")
    public ResponseEntity<List<ScheduleOptionResponse>> listOptions(
            @RequestParam UUID academicPeriodId
    ) {
        List<ScheduleOptionResponse> response = scheduleGenerationUseCase
                .listOptions(academicPeriodId)
                .stream()
                .map(ScheduleOptionResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/generations/{runId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Consultar estado de una generación de horario")
    public ResponseEntity<ScheduleGenerationRunResponse> getGenerationRun(
            @PathVariable UUID runId
    ) {
        return ResponseEntity.ok(
                ScheduleGenerationRunResponse.from(scheduleGenerationUseCase.getGenerationRun(runId))
        );
    }

    @PostMapping("/{scheduleId}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Confirmar una opción de horario docente")
    public ResponseEntity<ConfirmScheduleResponse> confirmOption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID scheduleId
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        UUID confirmedId = scheduleGenerationUseCase.confirmOption(scheduleId, actorId);
        return ResponseEntity.ok(new ConfirmScheduleResponse(confirmedId, "CONFIRMED"));
    }

    @GetMapping("/{scheduleId}/sections")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(
            summary = "Listar secciones con NRC de un horario docente",
            description = "Devuelve todas las secciones activas de un teaching_schedule, " +
                          "con el NRC de 5 dígitos asignado a cada una."
    )
    public ResponseEntity<List<CourseSectionResponse>> listSections(
            @PathVariable UUID scheduleId) {
        List<CourseSectionResponse> response = listCourseSectionsUseCase
                .listBySchedule(scheduleId)
                .stream()
                .map(CourseSectionResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(summary = "Cancelar un borrador de horario")
    public ResponseEntity<Void> cancelOption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID scheduleId
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        scheduleGenerationUseCase.cancelOption(scheduleId, actorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{scheduleId}/timetable")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    @Operation(
            summary = "Ver horario completo de una opción",
            description = "Devuelve todos los slots asignados con aula, docente, curso y día/hora."
    )
    public ResponseEntity<List<TimetableSlotResponse>> getTimetable(
            @PathVariable UUID scheduleId) {
        List<TimetableSlotResponse> response = timetableRepository
                .findByTeachingScheduleId(scheduleId)
                .stream()
                .map(TimetableSlotResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }
}
