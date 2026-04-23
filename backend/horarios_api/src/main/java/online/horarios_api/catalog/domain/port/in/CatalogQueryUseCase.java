package online.horarios_api.catalog.domain.port.in;

import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;

import java.util.List;
import java.util.UUID;

public interface CatalogQueryUseCase {
    List<Facultad> listFacultades();
    List<Carrera> listCarreras(UUID facultadId);
}
