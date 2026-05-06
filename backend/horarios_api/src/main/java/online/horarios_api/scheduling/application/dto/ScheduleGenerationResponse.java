package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ScheduleGeneration;

import java.util.UUID;

public record ScheduleGenerationResponse(
        UUID solverRunId,
        UUID reservationId,
        int seed,
        int remaining,
        String status,
        String websocketUrl
) {
    public static ScheduleGenerationResponse from(ScheduleGeneration generation) {
        return new ScheduleGenerationResponse(
                generation.solverRunId(),
                generation.reservationId(),
                generation.seed(),
                generation.remaining(),
                generation.status(),
                generation.websocketUrl()
        );
    }
}
