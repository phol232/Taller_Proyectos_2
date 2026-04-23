package online.horarios_api.catalog.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Facultad(
        UUID id,
        String code,
        String name,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}
