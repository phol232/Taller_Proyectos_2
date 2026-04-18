package online.horarios_api.token.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID    id,
        String  ipAddress,
        String  userAgent,
        Instant createdAt,
        Instant expiresAt
) {}
