package online.horarios_api.student.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.student.domain.model.StudentData;
import online.horarios_api.student.domain.port.in.StudentCommandUseCase;
import online.horarios_api.student.domain.port.in.StudentQueryUseCase;
import online.horarios_api.student.infrastructure.in.web.dto.StudentRequest;
import online.horarios_api.student.infrastructure.in.web.dto.StudentResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Tag(name = "Estudiantes", description = "CRUD de estudiantes")
public class StudentController {

    private final StudentCommandUseCase studentCommandUseCase;
    private final StudentQueryUseCase studentQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar estudiantes")
    public ResponseEntity<List<StudentResponse>> listAll() {
        return ResponseEntity.ok(studentQueryUseCase.listStudents().stream()
                .map(StudentResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener estudiante por ID")
    public ResponseEntity<StudentResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(StudentResponse.from(studentQueryUseCase.getStudent(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar estudiantes")
    public ResponseEntity<List<StudentResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(studentQueryUseCase.searchStudents(q).stream()
                .map(StudentResponse::from)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear estudiante")
    public ResponseEntity<StudentResponse> create(@Valid @RequestBody StudentRequest request) {
        StudentData command = new StudentData(
                request.userId(),
                request.code(),
                request.fullName(),
                request.cycle(),
                request.career(),
                request.creditLimit(),
                request.isActive(),
                request.facultadId(),
                request.carreraId(),
                request.approvedCourses()
        );
        return ResponseEntity.ok(StudentResponse.from(studentCommandUseCase.createStudent(command)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar estudiante")
    public ResponseEntity<StudentResponse> update(@PathVariable UUID id,
                                                  @Valid @RequestBody StudentRequest request) {
        StudentData command = new StudentData(
                request.userId(),
                request.code(),
                request.fullName(),
                request.cycle(),
                request.career(),
                request.creditLimit(),
                request.isActive(),
                request.facultadId(),
                request.carreraId(),
                request.approvedCourses()
        );
        return ResponseEntity.ok(StudentResponse.from(studentCommandUseCase.updateStudent(id, command)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar estudiante")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        studentCommandUseCase.deactivateStudent(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar estudiante")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        studentCommandUseCase.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}
