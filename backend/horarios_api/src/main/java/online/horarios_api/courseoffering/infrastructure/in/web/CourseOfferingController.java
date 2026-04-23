package online.horarios_api.courseoffering.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.courseoffering.domain.model.CourseOfferingData;
import online.horarios_api.courseoffering.domain.model.CourseSectionData;
import online.horarios_api.courseoffering.domain.model.SectionTeacherCandidate;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingCommandUseCase;
import online.horarios_api.courseoffering.domain.port.in.CourseOfferingQueryUseCase;
import online.horarios_api.courseoffering.infrastructure.in.web.dto.CourseOfferingRequest;
import online.horarios_api.courseoffering.infrastructure.in.web.dto.CourseOfferingResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/course-offerings")
@RequiredArgsConstructor
@Tag(name = "Ofertas de cursos", description = "CRUD de ofertas y secciones de cursos")
public class CourseOfferingController {

    private final CourseOfferingCommandUseCase courseOfferingCommandUseCase;
    private final CourseOfferingQueryUseCase courseOfferingQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar ofertas de cursos")
    public ResponseEntity<List<CourseOfferingResponse>> listAll() {
        return ResponseEntity.ok(courseOfferingQueryUseCase.listCourseOfferings().stream()
                .map(CourseOfferingResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener oferta de curso por ID")
    public ResponseEntity<CourseOfferingResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(CourseOfferingResponse.from(courseOfferingQueryUseCase.getCourseOffering(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar ofertas de cursos")
    public ResponseEntity<List<CourseOfferingResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(courseOfferingQueryUseCase.searchCourseOfferings(q).stream()
                .map(CourseOfferingResponse::from)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear oferta de curso")
    public ResponseEntity<CourseOfferingResponse> create(@Valid @RequestBody CourseOfferingRequest request) {
        return ResponseEntity.ok(CourseOfferingResponse.from(
                courseOfferingCommandUseCase.createCourseOffering(toCommand(request))
        ));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar oferta de curso")
    public ResponseEntity<CourseOfferingResponse> update(@PathVariable UUID id,
                                                         @Valid @RequestBody CourseOfferingRequest request) {
        return ResponseEntity.ok(CourseOfferingResponse.from(
                courseOfferingCommandUseCase.updateCourseOffering(id, toCommand(request))
        ));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cancelar oferta de curso")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        courseOfferingCommandUseCase.cancelCourseOffering(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar oferta de curso")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        courseOfferingCommandUseCase.deleteCourseOffering(id);
        return ResponseEntity.noContent().build();
    }

    private CourseOfferingData toCommand(CourseOfferingRequest request) {
        return new CourseOfferingData(
                request.academicPeriodId(),
                request.courseId(),
                request.expectedEnrollment(),
                request.status(),
                request.sections() == null ? List.of() : request.sections().stream()
                        .map(section -> new CourseSectionData(
                                section.sectionCode(),
                                section.vacancyLimit(),
                                section.status(),
                                section.teacherCandidates() == null ? List.of() : section.teacherCandidates().stream()
                                        .map(candidate -> new SectionTeacherCandidate(
                                                candidate.teacherId(),
                                                candidate.priorityWeight() == null ? 1.0 : candidate.priorityWeight()
                                        ))
                                        .toList()
                        ))
                        .toList()
        );
    }
}
