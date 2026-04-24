package online.horarios_api.catalog.infrastructure.in.web.dto;

import online.horarios_api.catalog.domain.model.Facultad;

import java.time.Instant;
import java.util.UUID;

public record FacultadResponse(
        UUID id,
        String code,
        String name,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
    public static FacultadResponse from(Facultad f) {
        return new FacultadResponse(f.id(), f.code(), f.name(), f.isActive(), f.createdAt(), f.updatedAt());
    }
}
