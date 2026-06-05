package online.horarios_api.catalog.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.catalog.domain.model.Carrera;
import online.horarios_api.catalog.domain.model.Facultad;
import online.horarios_api.catalog.domain.port.in.CatalogCommandUseCase;
import online.horarios_api.catalog.domain.port.in.CatalogQueryUseCase;
import online.horarios_api.catalog.domain.port.out.CatalogPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.infrastructure.cache.CacheNames;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
public class CatalogService implements CatalogQueryUseCase, CatalogCommandUseCase {

    private final CatalogPort catalogPort;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATALOG_FACULTADES, key = "'active'")
    public List<Facultad> listFacultades() {
        return catalogPort.listFacultades();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATALOG_CARRERAS, key = "#facultadId == null ? 'active-all' : 'active-' + #facultadId")
    public List<Carrera> listCarreras(UUID facultadId) {
        if (facultadId == null) {
            return catalogPort.listCarreras();
        }
        return catalogPort.listCarrerasByFacultad(facultadId);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATALOG_FACULTADES, key = "'all'")
    public List<Facultad> listAllFacultades() {
        return catalogPort.listAllFacultades();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.CATALOG_CARRERAS, key = "'all-' + #facultadId")
    public List<Carrera> listAllCarrerasByFacultad(UUID facultadId) {
        if (facultadId == null) {
            throw new BadRequestException("facultadId es obligatorio.");
        }
        return catalogPort.listAllCarrerasByFacultad(facultadId);
    }

    @Override
    @Transactional
    public Facultad createFacultad(String code, String name) {
        validateFacultadInput(code, name);
        return catalogPort.createFacultad(code.trim(), name.trim());
    }

    @Override
    @Transactional
    public Facultad updateFacultad(UUID id, String code, String name, boolean isActive) {
        validateFacultadInput(code, name);
        return catalogPort.updateFacultad(id, code.trim(), name.trim(), isActive);
    }

    @Override
    @Transactional
    public void deactivateFacultad(UUID id) {
        catalogPort.deactivateFacultad(id);
    }

    @Override
    @Transactional
    public void deleteFacultad(UUID id) {
        catalogPort.deleteFacultad(id);
    }

    @Override
    @Transactional
    public Carrera createCarrera(UUID facultadId, String code, String name) {
        validateCarreraInput(facultadId, name);
        String normalizedCode = code != null ? code.trim() : null;
        return catalogPort.createCarrera(facultadId, normalizedCode, name.trim());
    }

    @Override
    @Transactional
    public Carrera updateCarrera(UUID id, UUID facultadId, String code, String name, boolean isActive) {
        validateCarreraInput(facultadId, name);
        String normalizedCode = code != null ? code.trim() : null;
        return catalogPort.updateCarrera(id, facultadId, normalizedCode, name.trim(), isActive);
    }

    @Override
    @Transactional
    public void deactivateCarrera(UUID id) {
        catalogPort.deactivateCarrera(id);
    }

    @Override
    @Transactional
    public void deleteCarrera(UUID id) {
        catalogPort.deleteCarrera(id);
    }

    private void validateFacultadInput(String code, String name) {
        if (code == null || code.trim().isEmpty()) {
            throw new BadRequestException("El código de la facultad es obligatorio.");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new BadRequestException("El nombre de la facultad es obligatorio.");
        }
    }

    private void validateCarreraInput(UUID facultadId, String name) {
        if (facultadId == null) {
            throw new BadRequestException("La facultad es obligatoria.");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new BadRequestException("El nombre de la carrera es obligatorio.");
        }
    }
}
