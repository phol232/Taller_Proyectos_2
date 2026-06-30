package online.horarios_api.catalog.controller;

import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;
import online.horarios_api.catalog.domain.port.in.CatalogCommandUseCase;
import online.horarios_api.catalog.domain.port.in.CatalogQueryUseCase;
import online.horarios_api.catalog.infrastructure.in.web.CatalogController;
import online.horarios_api.catalog.infrastructure.in.web.dto.CarreraRequest;
import online.horarios_api.catalog.infrastructure.in.web.dto.CarreraResponse;
import online.horarios_api.catalog.infrastructure.in.web.dto.FacultadRequest;
import online.horarios_api.catalog.infrastructure.in.web.dto.FacultadResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CatalogController — tests unitarios")
class CatalogControllerTest {

    @Mock
    private CatalogQueryUseCase catalogQueryUseCase;

    @Mock
    private CatalogCommandUseCase catalogCommandUseCase;

    @InjectMocks
    private CatalogController controller;

    private Facultad facultad(UUID id) {
        return new Facultad(id, "FIE", "Ingeniería", true, Instant.now(), Instant.now());
    }

    private Carrera carrera(UUID id, UUID facultadId) {
        return new Carrera(id, facultadId, "SIS", "Sistemas", true, Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("listFacultades retorna facultades activas")
    void listFacultades() {
        UUID id = UUID.randomUUID();
        when(catalogQueryUseCase.listFacultades()).thenReturn(List.of(facultad(id)));

        ResponseEntity<List<FacultadResponse>> response = controller.listFacultades();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).id()).isEqualTo(id);
    }

    @Test
    @DisplayName("listCarreras filtra por facultad")
    void listCarreras() {
        UUID facultadId = UUID.randomUUID();
        when(catalogQueryUseCase.listCarreras(facultadId))
                .thenReturn(List.of(carrera(UUID.randomUUID(), facultadId)));

        ResponseEntity<List<CarreraResponse>> response = controller.listCarreras(facultadId);

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).facultadId()).isEqualTo(facultadId);
    }

    @Test
    @DisplayName("listAllFacultades incluye inactivas (admin)")
    void listAllFacultades() {
        when(catalogCommandUseCase.listAllFacultades()).thenReturn(List.of(facultad(UUID.randomUUID())));

        ResponseEntity<List<FacultadResponse>> response = controller.listAllFacultades();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("listAllCarrerasByFacultad retorna todas las carreras")
    void listAllCarrerasByFacultad() {
        UUID facultadId = UUID.randomUUID();
        when(catalogCommandUseCase.listAllCarrerasByFacultad(facultadId))
                .thenReturn(List.of(carrera(UUID.randomUUID(), facultadId)));

        ResponseEntity<List<CarreraResponse>> response = controller.listAllCarrerasByFacultad(facultadId);

        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("createFacultad delega y retorna la facultad creada")
    void createFacultad() {
        UUID id = UUID.randomUUID();
        when(catalogCommandUseCase.createFacultad("FIE", "Ingeniería")).thenReturn(facultad(id));

        ResponseEntity<FacultadResponse> response =
                controller.createFacultad(new FacultadRequest("FIE", "Ingeniería", null));

        assertThat(response.getBody().id()).isEqualTo(id);
        verify(catalogCommandUseCase).createFacultad("FIE", "Ingeniería");
    }

    @Test
    @DisplayName("updateFacultad usa isActive=true por defecto cuando es null")
    void updateFacultad_defaultActive() {
        UUID id = UUID.randomUUID();
        when(catalogCommandUseCase.updateFacultad(id, "FIE", "Ingeniería", true))
                .thenReturn(facultad(id));

        ResponseEntity<FacultadResponse> response =
                controller.updateFacultad(id, new FacultadRequest("FIE", "Ingeniería", null));

        assertThat(response.getBody().id()).isEqualTo(id);
        verify(catalogCommandUseCase).updateFacultad(id, "FIE", "Ingeniería", true);
    }

    @Test
    @DisplayName("updateFacultad respeta isActive=false explícito")
    void updateFacultad_inactive() {
        UUID id = UUID.randomUUID();
        when(catalogCommandUseCase.updateFacultad(id, "FIE", "Ingeniería", false))
                .thenReturn(facultad(id));

        controller.updateFacultad(id, new FacultadRequest("FIE", "Ingeniería", false));

        verify(catalogCommandUseCase).updateFacultad(id, "FIE", "Ingeniería", false);
    }

    @Test
    @DisplayName("deactivateFacultad retorna 204")
    void deactivateFacultad() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Void> response = controller.deactivateFacultad(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(catalogCommandUseCase).deactivateFacultad(id);
    }

    @Test
    @DisplayName("deleteFacultad retorna 204")
    void deleteFacultad() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Void> response = controller.deleteFacultad(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(catalogCommandUseCase).deleteFacultad(id);
    }

    @Test
    @DisplayName("createCarrera delega y retorna la carrera creada")
    void createCarrera() {
        UUID facultadId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(catalogCommandUseCase.createCarrera(facultadId, "SIS", "Sistemas"))
                .thenReturn(carrera(id, facultadId));

        ResponseEntity<CarreraResponse> response =
                controller.createCarrera(new CarreraRequest(facultadId, "SIS", "Sistemas", null));

        assertThat(response.getBody().id()).isEqualTo(id);
        verify(catalogCommandUseCase).createCarrera(facultadId, "SIS", "Sistemas");
    }

    @Test
    @DisplayName("updateCarrera usa isActive=true por defecto cuando es null")
    void updateCarrera_defaultActive() {
        UUID facultadId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(catalogCommandUseCase.updateCarrera(id, facultadId, "SIS", "Sistemas", true))
                .thenReturn(carrera(id, facultadId));

        controller.updateCarrera(id, new CarreraRequest(facultadId, "SIS", "Sistemas", null));

        verify(catalogCommandUseCase).updateCarrera(id, facultadId, "SIS", "Sistemas", true);
    }

    @Test
    @DisplayName("deactivateCarrera retorna 204")
    void deactivateCarrera() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Void> response = controller.deactivateCarrera(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(catalogCommandUseCase).deactivateCarrera(id);
    }

    @Test
    @DisplayName("deleteCarrera retorna 204")
    void deleteCarrera() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Void> response = controller.deleteCarrera(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(catalogCommandUseCase).deleteCarrera(id);
    }
}
