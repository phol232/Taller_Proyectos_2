package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record ScheduleGeneration(
        UUID solverRunId,
        UUID reservationId,
        int seed,
        int remaining,
        String status,
        String websocketUrl
) {}
