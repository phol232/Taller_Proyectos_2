package online.horarios_api.catalog.application.usecase;

import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;
import online.horarios_api.catalog.domain.port.out.CatalogPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CatalogService — lógica de aplicación con CatalogPort mockeado")
class CatalogServiceTest {

    @Mock
    private CatalogPort catalogPort;

    private CatalogService service;

    @BeforeEach
    void setUp() {
        service = new CatalogService(catalogPort);
    }

    @Test
    @DisplayName("listFacultades: delega en el puerto")
    void listFacultades_delegatesToPort() {
        List<Facultad> expected = List.of(new Facultad(UUID.randomUUID(), "ING", "Ingeniería", true, null, null));
        when(catalogPort.listFacultades()).thenReturn(expected);

        assertThat(service.listFacultades()).isEqualTo(expected);
    }

    @Test
    @DisplayName("listCarreras: sin facultadId usa listCarreras global")
    void listCarreras_withoutFacultadId_usesGlobalList() {
        service.listCarreras(null);

        verify(catalogPort).listCarreras();
    }

    @Test
    @DisplayName("listCarreras: con facultadId filtra por facultad")
    void listCarreras_withFacultadId_filtersByFacultad() {
        UUID facultadId = UUID.randomUUID();

        service.listCarreras(facultadId);

        verify(catalogPort).listCarrerasByFacultad(facultadId);
    }

    @Test
    @DisplayName("listAllFacultades: delega en el puerto")
    void listAllFacultades_delegatesToPort() {
        service.listAllFacultades();

        verify(catalogPort).listAllFacultades();
    }

    @Test
    @DisplayName("listAllCarrerasByFacultad: sin facultadId lanza BadRequestException")
    void listAllCarrerasByFacultad_withoutFacultadId_throws() {
        assertThatThrownBy(() -> service.listAllCarrerasByFacultad(null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createFacultad: valida código y nombre antes de delegar")
    void createFacultad_validatesAndDelegates() {
        when(catalogPort.createFacultad("ING", "Ingeniería"))
                .thenReturn(new Facultad(UUID.randomUUID(), "ING", "Ingeniería", true, null, null));

        Facultad created = service.createFacultad(" ING ", " Ingeniería ");

        assertThat(created.code()).isEqualTo("ING");
        verify(catalogPort).createFacultad("ING", "Ingeniería");
    }

    @Test
    @DisplayName("createFacultad: código vacío lanza BadRequestException")
    void createFacultad_blankCode_throws() {
        assertThatThrownBy(() -> service.createFacultad("  ", "Ingeniería"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createFacultad: nombre vacío lanza BadRequestException")
    void createFacultad_blankName_throws() {
        assertThatThrownBy(() -> service.createFacultad("ING", "  "))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("updateFacultad: valida y delega")
    void updateFacultad_validatesAndDelegates() {
        UUID id = UUID.randomUUID();

        service.updateFacultad(id, "ING", "Ingeniería", true);

        verify(catalogPort).updateFacultad(id, "ING", "Ingeniería", true);
    }

    @Test
    @DisplayName("deactivateFacultad: delega en el puerto")
    void deactivateFacultad_delegatesToPort() {
        UUID id = UUID.randomUUID();

        service.deactivateFacultad(id);

        verify(catalogPort).deactivateFacultad(id);
    }

    @Test
    @DisplayName("deleteFacultad: delega en el puerto")
    void deleteFacultad_delegatesToPort() {
        UUID id = UUID.randomUUID();

        service.deleteFacultad(id);

        verify(catalogPort).deleteFacultad(id);
    }

    @Test
    @DisplayName("createCarrera: facultadId nulo lanza BadRequestException")
    void createCarrera_nullFacultadId_throws() {
        assertThatThrownBy(() -> service.createCarrera(null, "INF", "Informática"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCarrera: normaliza código y delega")
    void createCarrera_normalizesAndDelegates() {
        UUID facultadId = UUID.randomUUID();
        when(catalogPort.createCarrera(any(), any(), any()))
                .thenReturn(new Carrera(UUID.randomUUID(), facultadId, "INF", "Informática", true, null, null));

        service.createCarrera(facultadId, " INF ", " Informática ");

        verify(catalogPort).createCarrera(facultadId, "INF", "Informática");
    }

    @Test
    @DisplayName("createCarrera: nombre vacío lanza BadRequestException")
    void createCarrera_blankName_throws() {
        assertThatThrownBy(() -> service.createCarrera(UUID.randomUUID(), "INF", " "))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("updateCarrera: normaliza código y delega")
    void updateCarrera_normalizesAndDelegates() {
        UUID id = UUID.randomUUID();
        UUID facultadId = UUID.randomUUID();
        when(catalogPort.updateCarrera(any(), any(), any(), any(), any(Boolean.class)))
                .thenReturn(new Carrera(id, facultadId, "INF", "Informática", true, null, null));

        service.updateCarrera(id, facultadId, " INF ", " Informática ", true);

        verify(catalogPort).updateCarrera(id, facultadId, "INF", "Informática", true);
    }

    @Test
    @DisplayName("deactivateCarrera: delega en el puerto")
    void deactivateCarrera_delegatesToPort() {
        UUID id = UUID.randomUUID();

        service.deactivateCarrera(id);

        verify(catalogPort).deactivateCarrera(id);
    }

    @Test
    @DisplayName("deleteCarrera: delega en el puerto")
    void deleteCarrera_delegatesToPort() {
        UUID id = UUID.randomUUID();

        service.deleteCarrera(id);

        verify(catalogPort).deleteCarrera(id);
    }
}
