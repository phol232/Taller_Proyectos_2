package online.horarios_api.catalog.infrastructure.in.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.catalog.domain.port.in.CatalogCommandUseCase;
import online.horarios_api.catalog.domain.port.in.CatalogQueryUseCase;
import online.horarios_api.catalog.infrastructure.in.web.dto.CarreraRequest;
import online.horarios_api.catalog.infrastructure.in.web.dto.CarreraResponse;
import online.horarios_api.catalog.infrastructure.in.web.dto.FacultadRequest;
import online.horarios_api.catalog.infrastructure.in.web.dto.FacultadResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogQueryUseCase catalogQueryUseCase;
    private final CatalogCommandUseCase catalogCommandUseCase;

    // ─── Lectura pública (autenticada) ─────────────────────────────

    @GetMapping("/facultades")
    public ResponseEntity<List<FacultadResponse>> listFacultades() {
        List<FacultadResponse> result = catalogQueryUseCase.listFacultades().stream()
                .map(FacultadResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/carreras")
    public ResponseEntity<List<CarreraResponse>> listCarreras(
            @RequestParam(required = false) UUID facultadId) {
        List<CarreraResponse> result = catalogQueryUseCase.listCarreras(facultadId).stream()
                .map(CarreraResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    // ─── Lectura admin (incluye inactivas) ─────────────────────────

    @GetMapping("/facultades/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FacultadResponse>> listAllFacultades() {
        List<FacultadResponse> result = catalogCommandUseCase.listAllFacultades().stream()
                .map(FacultadResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/facultades/{facultadId}/carreras/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CarreraResponse>> listAllCarrerasByFacultad(
            @PathVariable UUID facultadId) {
        List<CarreraResponse> result = catalogCommandUseCase
                .listAllCarrerasByFacultad(facultadId).stream()
                .map(CarreraResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    // ─── Mutación: Facultades ──────────────────────────────────────

    @PostMapping("/facultades")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FacultadResponse> createFacultad(
            @Valid @RequestBody FacultadRequest request) {
        return ResponseEntity.ok(FacultadResponse.from(
                catalogCommandUseCase.createFacultad(request.code(), request.name())
        ));
    }

    @PutMapping("/facultades/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FacultadResponse> updateFacultad(
            @PathVariable UUID id,
            @Valid @RequestBody FacultadRequest request) {
        boolean isActive = request.isActive() == null || request.isActive();
        return ResponseEntity.ok(FacultadResponse.from(
                catalogCommandUseCase.updateFacultad(id, request.code(), request.name(), isActive)
        ));
    }

    @PostMapping("/facultades/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateFacultad(@PathVariable UUID id) {
        catalogCommandUseCase.deactivateFacultad(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/facultades/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFacultad(@PathVariable UUID id) {
        catalogCommandUseCase.deleteFacultad(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Mutación: Carreras ────────────────────────────────────────

    @PostMapping("/carreras")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CarreraResponse> createCarrera(
            @Valid @RequestBody CarreraRequest request) {
        return ResponseEntity.ok(CarreraResponse.from(
                catalogCommandUseCase.createCarrera(
                        request.facultadId(), request.code(), request.name()
                )
        ));
    }

    @PutMapping("/carreras/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CarreraResponse> updateCarrera(
            @PathVariable UUID id,
            @Valid @RequestBody CarreraRequest request) {
        boolean isActive = request.isActive() == null || request.isActive();
        return ResponseEntity.ok(CarreraResponse.from(
                catalogCommandUseCase.updateCarrera(
                        id, request.facultadId(), request.code(), request.name(), isActive
                )
        ));
    }

    @PostMapping("/carreras/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateCarrera(@PathVariable UUID id) {
        catalogCommandUseCase.deactivateCarrera(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/carreras/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCarrera(@PathVariable UUID id) {
        catalogCommandUseCase.deleteCarrera(id);
        return ResponseEntity.noContent().build();
    }
}
