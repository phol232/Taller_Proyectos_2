package online.horarios_api.academicperiod.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodCommandUseCase;
import online.horarios_api.academicperiod.domain.port.in.AcademicPeriodQueryUseCase;
import online.horarios_api.academicperiod.infrastructure.in.web.dto.AcademicPeriodRequest;
import online.horarios_api.academicperiod.infrastructure.in.web.dto.AcademicPeriodResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/academic-periods")
@RequiredArgsConstructor
@Tag(name = "Períodos académicos", description = "CRUD de períodos académicos")
public class AcademicPeriodController {

    private final AcademicPeriodCommandUseCase academicPeriodCommandUseCase;
    private final AcademicPeriodQueryUseCase academicPeriodQueryUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar períodos académicos")
    public ResponseEntity<List<AcademicPeriodResponse>> listAll() {
        return ResponseEntity.ok(academicPeriodQueryUseCase.listAcademicPeriods().stream()
                .map(AcademicPeriodResponse::from)
                .toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtener período académico por ID")
    public ResponseEntity<AcademicPeriodResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(AcademicPeriodResponse.from(academicPeriodQueryUseCase.getAcademicPeriod(id)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar períodos académicos")
    public ResponseEntity<List<AcademicPeriodResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(academicPeriodQueryUseCase.searchAcademicPeriods(q).stream()
                .map(AcademicPeriodResponse::from)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear período académico")
    public ResponseEntity<AcademicPeriodResponse> create(@Valid @RequestBody AcademicPeriodRequest request) {
        AcademicPeriodData command = new AcademicPeriodData(
                request.code(),
                request.name(),
                request.startsAt(),
                request.endsAt(),
                request.status(),
                request.maxStudentCredits()
        );
        return ResponseEntity.ok(AcademicPeriodResponse.from(
                academicPeriodCommandUseCase.createAcademicPeriod(command)
        ));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar período académico")
    public ResponseEntity<AcademicPeriodResponse> update(@PathVariable UUID id,
                                                         @Valid @RequestBody AcademicPeriodRequest request) {
        AcademicPeriodData command = new AcademicPeriodData(
                request.code(),
                request.name(),
                request.startsAt(),
                request.endsAt(),
                request.status(),
                request.maxStudentCredits()
        );
        return ResponseEntity.ok(AcademicPeriodResponse.from(
                academicPeriodCommandUseCase.updateAcademicPeriod(id, command)
        ));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar período académico")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        academicPeriodCommandUseCase.deactivateAcademicPeriod(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar período académico")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        academicPeriodCommandUseCase.deleteAcademicPeriod(id);
        return ResponseEntity.noContent().build();
    }
}
