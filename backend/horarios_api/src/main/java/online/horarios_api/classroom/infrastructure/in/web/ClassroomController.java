package online.horarios_api.classroom.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.classroom.domain.port.in.ClassroomCommandUseCase;
import online.horarios_api.classroom.domain.port.in.ClassroomQueryUseCase;
import online.horarios_api.classroom.infrastructure.in.web.dto.ClassroomRequest;
import online.horarios_api.classroom.infrastructure.in.web.dto.ClassroomResponse;
import online.horarios_api.shared.domain.model.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/classrooms")
@RequiredArgsConstructor
@Tag(name = "Aulas", description = "CRUD de aulas")
public class ClassroomController {

    private final ClassroomCommandUseCase classroomCommandUseCase;
    private final ClassroomQueryUseCase classroomQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar aulas (paginado)")
    public ResponseEntity<Page<ClassroomResponse>> listAll(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(classroomQueryUseCase.listClassroomsPaged(page, pageSize).map(ClassroomResponse::from));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener aula por ID")
    public ResponseEntity<ClassroomResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ClassroomResponse.from(classroomQueryUseCase.getClassroom(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar aulas (paginado)")
    public ResponseEntity<Page<ClassroomResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(classroomQueryUseCase.searchClassroomsPaged(q, page, pageSize).map(ClassroomResponse::from));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear aula")
    public ResponseEntity<ClassroomResponse> create(@Valid @RequestBody ClassroomRequest request) {
        ClassroomData command = new ClassroomData(
                request.code(),
                request.name(),
                request.capacity(),
                request.type(),
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
        return ResponseEntity.ok(ClassroomResponse.from(classroomCommandUseCase.createClassroom(command)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar aula")
    public ResponseEntity<ClassroomResponse> update(@PathVariable UUID id,
                                                    @Valid @RequestBody ClassroomRequest request) {
        ClassroomData command = new ClassroomData(
                request.code(),
                request.name(),
                request.capacity(),
                request.type(),
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
        return ResponseEntity.ok(ClassroomResponse.from(classroomCommandUseCase.updateClassroom(id, command)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar aula")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        classroomCommandUseCase.deactivateClassroom(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar aula")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        classroomCommandUseCase.deleteClassroom(id);
        return ResponseEntity.noContent().build();
    }
}
