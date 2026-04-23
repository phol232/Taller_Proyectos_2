package online.horarios_api.catalog.domain.port.out;

import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;

import java.util.List;
import java.util.UUID;

public interface CatalogPort {

    // Lectura pública (solo activas).
    List<Facultad> listFacultades();
    List<Carrera> listCarreras();
    List<Carrera> listCarrerasByFacultad(UUID facultadId);

    // Lectura admin (incluye inactivas).
    List<Facultad> listAllFacultades();
    List<Carrera> listAllCarrerasByFacultad(UUID facultadId);

    // Mutación: facultades
    Facultad createFacultad(String code, String name);
    Facultad updateFacultad(UUID id, String code, String name, boolean isActive);
    void deactivateFacultad(UUID id);
    void deleteFacultad(UUID id);

    // Mutación: carreras
    Carrera createCarrera(UUID facultadId, String code, String name);
    Carrera updateCarrera(UUID id, UUID facultadId, String code, String name, boolean isActive);
    void deactivateCarrera(UUID id);
    void deleteCarrera(UUID id);
}
