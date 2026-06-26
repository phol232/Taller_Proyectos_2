package online.horarios_api.scheduling.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.application.dto.StudentBuilderDraftResponse;
import online.horarios_api.scheduling.application.dto.StudentScheduleConflictResponse;
import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleBuilderUseCase;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.scheduling.infrastructure.in.web.dto.StudentBuilderAddCourseRequest;
import online.horarios_api.scheduling.infrastructure.in.web.dto.StudentBuilderImportRequest;
import online.horarios_api.scheduling.infrastructure.in.web.dto.StudentBuilderValidateRequest;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/students/{studentId}/schedule/builder")
@RequiredArgsConstructor
@Tag(name = "Constructor de horario del estudiante", description = "Armar horario manualmente con validación en tiempo real")
public class StudentScheduleBuilderController {

    private final StudentScheduleBuilderUseCase builderUseCase;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Obtener el borrador manual del estudiante en el período o por horario")
    public ResponseEntity<StudentBuilderDraftResponse> getDraft(
            @PathVariable UUID studentId,
            @RequestParam(required = false) UUID periodId,
            @RequestParam(required = false) UUID scheduleId
    ) {
        if (scheduleId == null && periodId == null) {
            throw new BadRequestException("Debe indicar periodId o scheduleId.");
        }
        Optional<StudentBuilderDraft> draft = scheduleId != null
                ? builderUseCase.getDraftBySchedule(studentId, scheduleId)
                : builderUseCase.getDraft(studentId, periodId);
        return draft
                .map(StudentBuilderDraftResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/ensure")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Crear o reutilizar el borrador manual del período")
    public ResponseEntity<Map<String, UUID>> ensureDraft(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID studentId,
            @RequestParam UUID periodId
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        UUID scheduleId = builderUseCase.ensureDraft(studentId, periodId, actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("scheduleId", scheduleId));
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Validar agregar un curso/sección al borrador")
    public ResponseEntity<List<StudentScheduleConflictResponse>> validate(
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentBuilderValidateRequest request
    ) {
        List<StudentScheduleConflictResponse> response = builderUseCase
                .validateAddCourse(
                        studentId,
                        request.scheduleId(),
                        request.courseId(),
                        request.assignmentIds()
                )
                .stream()
                .map(StudentScheduleConflictResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Agregar un curso con su sección al borrador manual")
    public ResponseEntity<Map<String, UUID>> addCourse(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID studentId,
            @RequestParam UUID scheduleId,
            @Valid @RequestBody StudentBuilderAddCourseRequest request
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        UUID itemId = builderUseCase.addCourse(
                studentId,
                scheduleId,
                request.courseId(),
                request.assignmentIds(),
                actorId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("itemId", itemId));
    }

    @DeleteMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Quitar un curso del borrador manual")
    public ResponseEntity<Void> removeCourse(
            @PathVariable UUID studentId,
            @RequestParam UUID scheduleId,
            @PathVariable UUID courseId
    ) {
        builderUseCase.removeCourse(scheduleId, courseId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/renew")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Renovar el hold del borrador manual")
    public ResponseEntity<Void> renew(
            @PathVariable UUID studentId,
            @RequestParam UUID scheduleId
    ) {
        builderUseCase.renewDraft(scheduleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Importar una opción generada al constructor manual")
    public ResponseEntity<Map<String, UUID>> importFromOption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID studentId,
            @RequestParam UUID periodId,
            @Valid @RequestBody StudentBuilderImportRequest request
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        UUID scheduleId = builderUseCase.importFromOption(
                studentId, periodId, request.sourceScheduleId(), actorId);
        return ResponseEntity.ok(Map.of("scheduleId", scheduleId));
    }
}
