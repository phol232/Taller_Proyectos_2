package online.horarios_api.catalog.infrastructure.out.persistence;

import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CatalogJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class CatalogJdbcAdapterTest extends PostgresPersistenceTestBase {

    private CatalogJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new CatalogJdbcAdapter(newJdbcTemplate());
    }

    @Test
    @DisplayName("createFacultad: persiste y devuelve la facultad activa")
    void createFacultad_persists() {
        Facultad facultad = adapter.createFacultad("ING", "Facultad de Ingeniería");

        assertThat(facultad.id()).isNotNull();
        assertThat(facultad.code()).isEqualTo("ING");
        assertThat(facultad.name()).isEqualTo("Facultad de Ingeniería");
        assertThat(facultad.isActive()).isTrue();
    }

    @Test
    @DisplayName("createFacultad: código duplicado lanza DuplicateFieldException")
    void createFacultad_duplicateCode_throws() {
        adapter.createFacultad("ING", "Facultad de Ingeniería");

        assertThatThrownBy(() -> adapter.createFacultad("ING", "Otra facultad"))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("listFacultades / listAllFacultades: solo activas vs todas")
    void listFacultades_filtersByActive() {
        Facultad ing = adapter.createFacultad("ING", "Ingeniería");
        Facultad med = adapter.createFacultad("MED", "Medicina");
        adapter.updateFacultad(med.id(), med.code(), med.name(), false);

        List<Facultad> activas = adapter.listFacultades();
        List<Facultad> todas = adapter.listAllFacultades();

        assertThat(activas).extracting(Facultad::code).containsExactly("ING");
        assertThat(todas).extracting(Facultad::code).containsExactlyInAnyOrder("ING", "MED");
        assertThat(ing.code()).isEqualTo("ING");
    }

    @Test
    @DisplayName("updateFacultad: actualiza código, nombre y estado")
    void updateFacultad_updatesFields() {
        Facultad created = adapter.createFacultad("ING", "Ingeniería");

        Facultad updated = adapter.updateFacultad(created.id(), "ING2", "Ingeniería Actualizada", true);

        assertThat(updated.code()).isEqualTo("ING2");
        assertThat(updated.name()).isEqualTo("Ingeniería Actualizada");
    }

    @Test
    @DisplayName("updateFacultad: id inexistente lanza NotFoundException")
    void updateFacultad_notFound_throws() {
        assertThatThrownBy(() -> adapter.updateFacultad(UUID.randomUUID(), "X", "Y", true))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deactivateFacultad: desactiva también las carreras asociadas")
    void deactivateFacultad_cascadesToCarreras() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        Carrera carrera = adapter.createCarrera(facultad.id(), "INF", "Informática");

        adapter.deactivateFacultad(facultad.id());

        List<Carrera> activas = adapter.listCarrerasByFacultad(facultad.id());
        List<Carrera> todas = adapter.listAllCarrerasByFacultad(facultad.id());
        assertThat(activas).isEmpty();
        assertThat(todas).extracting(Carrera::id).containsExactly(carrera.id());
    }

    @Test
    @DisplayName("deactivateFacultad: id inexistente lanza NotFoundException")
    void deactivateFacultad_notFound_throws() {
        assertThatThrownBy(() -> adapter.deactivateFacultad(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deleteFacultad: elimina en cascada las carreras (ON DELETE CASCADE)")
    void deleteFacultad_cascadesDeleteOfCarreras() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        adapter.createCarrera(facultad.id(), "INF", "Informática");

        adapter.deleteFacultad(facultad.id());

        assertThat(adapter.listAllFacultades()).isEmpty();
        assertThat(adapter.listAllCarrerasByFacultad(facultad.id())).isEmpty();
    }

    @Test
    @DisplayName("deleteFacultad: id inexistente lanza NotFoundException")
    void deleteFacultad_notFound_throws() {
        assertThatThrownBy(() -> adapter.deleteFacultad(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("createCarrera: facultad inexistente lanza NotFoundException")
    void createCarrera_facultadNotFound_throws() {
        assertThatThrownBy(() -> adapter.createCarrera(UUID.randomUUID(), "INF", "Informática"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("createCarrera: código duplicado lanza DuplicateFieldException")
    void createCarrera_duplicateCode_throws() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        adapter.createCarrera(facultad.id(), "INF", "Informática");

        assertThatThrownBy(() -> adapter.createCarrera(facultad.id(), "INF", "Otra"))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("listCarreras / listCarrerasByFacultad: solo activas")
    void listCarreras_filtersByActive() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        Carrera inf = adapter.createCarrera(facultad.id(), "INF", "Informática");
        Carrera civil = adapter.createCarrera(facultad.id(), "CIV", "Civil");
        adapter.deactivateCarrera(civil.id());

        assertThat(adapter.listCarreras()).extracting(Carrera::code).containsExactly("INF");
        assertThat(adapter.listCarrerasByFacultad(facultad.id()))
                .extracting(Carrera::id).containsExactly(inf.id());
    }

    @Test
    @DisplayName("updateCarrera: actualiza facultad, código y nombre")
    void updateCarrera_updatesFields() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        Facultad otraFacultad = adapter.createFacultad("MED", "Medicina");
        Carrera carrera = adapter.createCarrera(facultad.id(), "INF", "Informática");

        Carrera updated = adapter.updateCarrera(
                carrera.id(), otraFacultad.id(), "INF2", "Informática Actualizada", true);

        assertThat(updated.facultadId()).isEqualTo(otraFacultad.id());
        assertThat(updated.code()).isEqualTo("INF2");
        assertThat(updated.name()).isEqualTo("Informática Actualizada");
    }

    @Test
    @DisplayName("updateCarrera: facultad inexistente lanza NotFoundException")
    void updateCarrera_facultadNotFound_throws() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        Carrera carrera = adapter.createCarrera(facultad.id(), "INF", "Informática");

        assertThatThrownBy(() ->
                adapter.updateCarrera(carrera.id(), UUID.randomUUID(), "INF", "Informática", true))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateCarrera: id inexistente lanza NotFoundException")
    void updateCarrera_notFound_throws() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");

        assertThatThrownBy(() ->
                adapter.updateCarrera(UUID.randomUUID(), facultad.id(), "INF", "Informática", true))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deactivateCarrera: id inexistente lanza NotFoundException")
    void deactivateCarrera_notFound_throws() {
        assertThatThrownBy(() -> adapter.deactivateCarrera(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deleteCarrera: elimina la carrera")
    void deleteCarrera_deletes() {
        Facultad facultad = adapter.createFacultad("ING", "Ingeniería");
        Carrera carrera = adapter.createCarrera(facultad.id(), "INF", "Informática");

        adapter.deleteCarrera(carrera.id());

        assertThat(adapter.listAllCarrerasByFacultad(facultad.id())).isEmpty();
    }

    @Test
    @DisplayName("deleteCarrera: id inexistente lanza NotFoundException")
    void deleteCarrera_notFound_throws() {
        assertThatThrownBy(() -> adapter.deleteCarrera(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }
}
