package online.horarios_api.scheduling.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.application.dto.ActiveStudentScheduleResponse;
import online.horarios_api.scheduling.application.dto.ConfirmScheduleResponse;
import online.horarios_api.scheduling.application.dto.StudentPendingCourseResponse;
import online.horarios_api.scheduling.application.dto.StudentScheduleGenerationResponse;
import online.horarios_api.scheduling.application.dto.StudentScheduleOptionResponse;
import online.horarios_api.scheduling.application.dto.TimetableSlotResponse;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleUseCase;
import online.horarios_api.scheduling.domain.port.out.TimetableRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Tag(name = "Horario del estudiante", description = "Generación, comparación y confirmación de horarios del estudiante")
public class StudentScheduleController {

    private final StudentScheduleUseCase studentScheduleUseCase;
    private final TimetableRepository timetableRepository;

    @GetMapping("/{studentId}/available-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Listar cursos pendientes del estudiante con las secciones publicadas")
    public ResponseEntity<List<StudentPendingCourseResponse>> listAvailableCourses(
            @PathVariable UUID studentId,
            @RequestParam UUID periodId
    ) {
        List<StudentPendingCourseResponse> response = studentScheduleUseCase
                .listPendingCourses(studentId, periodId)
                .stream()
                .map(StudentPendingCourseResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{studentId}/schedule")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Obtener el horario activo del estudiante en el período")
    public ResponseEntity<ActiveStudentScheduleResponse> getActiveSchedule(
            @PathVariable UUID studentId,
            @RequestParam UUID periodId
    ) {
        return studentScheduleUseCase.getActiveSchedule(studentId, periodId)
                .map(ActiveStudentScheduleResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{studentId}/schedule/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(
            summary = "Generar una opción de horario en borrador",
            description = "Dispara el solver para el estudiante; reserva el cupo temporalmente (hold). "
                    + "Si ya había borradores vivos, devuelve un aviso de que caducarán."
    )
    public ResponseEntity<StudentScheduleGenerationResponse> generate(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID studentId,
            @RequestParam UUID periodId
    ) {
        UUID actorId = UUID.fromString(jwt.getSubject());
        StudentScheduleGenerationResponse response = StudentScheduleGenerationResponse.from(
                studentScheduleUseCase.generateOptions(studentId, actorId, periodId, null)
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{studentId}/schedule/options")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Listar las opciones de horario en borrador con su tiempo de hold restante")
    public ResponseEntity<List<StudentScheduleOptionResponse>> listOptions(
            @PathVariable UUID studentId,
            @RequestParam UUID periodId
    ) {
        List<StudentScheduleOptionResponse> response = studentScheduleUseCase
                .listOptions(studentId, periodId)
                .stream()
                .map(StudentScheduleOptionResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{studentId}/schedule/options/{scheduleId}/timetable")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Ver una opción de horario en formato calendario (día/hora)")
    public ResponseEntity<List<TimetableSlotResponse>> getOptionTimetable(
            @PathVariable UUID studentId,
            @PathVariable UUID scheduleId
    ) {
        List<TimetableSlotResponse> response = timetableRepository
                .findByStudentScheduleId(scheduleId)
                .stream()
                .map(TimetableSlotResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{studentId}/schedule/options/{scheduleId}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Confirmar una opción de horario (consume el cupo y descarta las demás)")
    public ResponseEntity<ConfirmScheduleResponse> confirm(
            @PathVariable UUID studentId,
            @PathVariable UUID scheduleId
    ) {
        UUID confirmedId = studentScheduleUseCase.confirmOption(studentId, scheduleId);
        return ResponseEntity.ok(new ConfirmScheduleResponse(confirmedId, "CONFIRMED"));
    }

    @PostMapping("/{studentId}/schedule/options/{scheduleId}/renew")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Renovar el hold de una opción mientras el estudiante decide")
    public ResponseEntity<Void> renew(
            @PathVariable UUID studentId,
            @PathVariable UUID scheduleId
    ) {
        studentScheduleUseCase.renewOption(studentId, scheduleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{studentId}/schedule/options/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR', 'STUDENT')")
    @Operation(summary = "Descartar una opción de horario en borrador y liberar su cupo")
    public ResponseEntity<Void> release(
            @PathVariable UUID studentId,
            @PathVariable UUID scheduleId
    ) {
        studentScheduleUseCase.releaseOption(studentId, scheduleId);
        return ResponseEntity.noContent().build();
    }
}
