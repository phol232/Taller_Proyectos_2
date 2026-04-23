package online.horarios_api.catalog.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Carrera(
        UUID id,
        UUID facultadId,
        String code,
        String name,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}
