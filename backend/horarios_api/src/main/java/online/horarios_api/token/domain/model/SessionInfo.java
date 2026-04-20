package online.horarios_api.token.domain.model;

import java.time.Instant;
import java.util.UUID;

public record SessionInfo(
        UUID    id,
        String  ipAddress,
        String  userAgent,
        Instant createdAt,
        Instant expiresAt
) {}
