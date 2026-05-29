package online.horarios_api.scheduling.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import online.horarios_api.scheduling.application.dto.ActiveStudentScheduleResponse;
import online.horarios_api.scheduling.application.dto.StudentPendingCourseResponse;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Tag(name = "Horario del estudiante", description = "Consulta de oferta horaria disponible para el estudiante")
public class StudentScheduleController {

    private final StudentScheduleUseCase studentScheduleUseCase;

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
}
