package online.horarios_api.scheduling.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Una opción de horario del estudiante en borrador, con el tiempo de hold
 * (bloqueo de cupo) restante.
 */
public record StudentScheduleOption(
        UUID scheduleId,
        int optionIndex,
        String status,
        Instant createdAt,
        Instant expiresAt,
        int secondsRemaining,
        int itemCount
) {}
