package online.horarios_api.course.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.course.domain.port.in.CourseCommandUseCase;
import online.horarios_api.course.domain.port.in.CourseQueryUseCase;
import online.horarios_api.course.infrastructure.in.web.dto.CourseRequest;
import online.horarios_api.course.infrastructure.in.web.dto.CourseResponse;
import online.horarios_api.shared.domain.model.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Tag(name = "Cursos", description = "CRUD de cursos")
public class CourseController {

    private final CourseCommandUseCase courseCommandUseCase;
    private final CourseQueryUseCase courseQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar cursos (paginado)")
    public ResponseEntity<Page<CourseResponse>> listAll(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(courseQueryUseCase.listCoursesPaged(page, pageSize).map(CourseResponse::from));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener curso por ID")
    public ResponseEntity<CourseResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(CourseResponse.from(courseQueryUseCase.getCourse(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar cursos por código o nombre (paginado)")
    public ResponseEntity<Page<CourseResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        return ResponseEntity.ok(courseQueryUseCase.searchCoursesPaged(q, page, pageSize).map(CourseResponse::from));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear curso")
    public ResponseEntity<CourseResponse> create(@Valid @RequestBody CourseRequest request) {
        CourseData command = new CourseData(
                request.code(),
                request.name(),
                request.credits(),
                request.weeklyHours(),
                request.requiredRoomType(),
                request.isActive(),
                request.prerequisites()
        );
        return ResponseEntity.ok(CourseResponse.from(courseCommandUseCase.createCourse(command)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar curso")
    public ResponseEntity<CourseResponse> update(@PathVariable UUID id,
                                                 @Valid @RequestBody CourseRequest request) {
        CourseData command = new CourseData(
                request.code(),
                request.name(),
                request.credits(),
                request.weeklyHours(),
                request.requiredRoomType(),
                request.isActive(),
                request.prerequisites()
        );
        return ResponseEntity.ok(CourseResponse.from(courseCommandUseCase.updateCourse(id, command)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar curso")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        courseCommandUseCase.deactivateCourse(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar curso")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        courseCommandUseCase.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }
}
