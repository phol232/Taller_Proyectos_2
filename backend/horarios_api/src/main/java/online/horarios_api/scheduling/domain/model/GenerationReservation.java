package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record GenerationReservation(
        UUID reservationId,
        boolean accepted,
        int retryAfterSeconds,
        int remaining
) {}
