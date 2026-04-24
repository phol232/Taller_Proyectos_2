package online.horarios_api.catalog.infrastructure.in.web.dto;

import online.horarios_api.catalog.domain.model.Carrera;

import java.time.Instant;
import java.util.UUID;

public record CarreraResponse(
        UUID id,
        UUID facultadId,
        String code,
        String name,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
    public static CarreraResponse from(Carrera c) {
        return new CarreraResponse(c.id(), c.facultadId(), c.code(), c.name(), c.isActive(), c.createdAt(), c.updatedAt());
    }
}
