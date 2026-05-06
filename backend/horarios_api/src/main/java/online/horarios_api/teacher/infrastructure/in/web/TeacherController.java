package online.horarios_api.teacher.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.teacher.domain.model.TeacherData;
import online.horarios_api.teacher.domain.port.in.TeacherCommandUseCase;
import online.horarios_api.teacher.domain.port.in.TeacherQueryUseCase;
import online.horarios_api.teacher.infrastructure.in.web.dto.TeacherRequest;
import online.horarios_api.teacher.infrastructure.in.web.dto.TeacherResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teachers")
@RequiredArgsConstructor
@Tag(name = "Docentes", description = "CRUD de docentes")
public class TeacherController {

    private final TeacherCommandUseCase teacherCommandUseCase;
    private final TeacherQueryUseCase teacherQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar docentes (paginado)")
    public ResponseEntity<Page<TeacherResponse>> listAll(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(teacherQueryUseCase.listTeachersPaged(page, pageSize).map(TeacherResponse::from));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener docente por ID")
    public ResponseEntity<TeacherResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(TeacherResponse.from(teacherQueryUseCase.getTeacher(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar docentes (paginado)")
    public ResponseEntity<Page<TeacherResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(teacherQueryUseCase.searchTeachersPaged(q, page, pageSize).map(TeacherResponse::from));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear docente")
    public ResponseEntity<TeacherResponse> create(@Valid @RequestBody TeacherRequest request) {
        TeacherData command = new TeacherData(
                request.userId(),
                request.code(),
                request.fullName(),
                request.specialty(),
                request.isActive(),
                request.availability() == null ? List.of() : request.availability().stream().map(slot -> {
                    try {
                        return slot.toDomain();
                    } catch (RuntimeException ex) {
                        throw new online.horarios_api.shared.domain.exception.BadRequestException("Formato de hora inválido.");
                    }
                }).toList(),
                request.courseCodes() == null ? List.of() : request.courseCodes(),
                request.courseComponentIds() == null ? List.of() : request.courseComponentIds()
        );
        return ResponseEntity.ok(TeacherResponse.from(teacherCommandUseCase.createTeacher(command)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar docente")
    public ResponseEntity<TeacherResponse> update(@PathVariable UUID id,
                                                  @Valid @RequestBody TeacherRequest request) {
        TeacherData command = new TeacherData(
                request.userId(),
                request.code(),
                request.fullName(),
                request.specialty(),
                request.isActive(),
                request.availability() == null ? List.of() : request.availability().stream().map(slot -> {
                    try {
                        return slot.toDomain();
                    } catch (RuntimeException ex) {
                        throw new online.horarios_api.shared.domain.exception.BadRequestException("Formato de hora inválido.");
                    }
                }).toList(),
                request.courseCodes() == null ? List.of() : request.courseCodes(),
                request.courseComponentIds() == null ? List.of() : request.courseComponentIds()
        );
        return ResponseEntity.ok(TeacherResponse.from(teacherCommandUseCase.updateTeacher(id, command)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar docente")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        teacherCommandUseCase.deactivateTeacher(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar docente")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        teacherCommandUseCase.deleteTeacher(id);
        return ResponseEntity.noContent().build();
    }
}
