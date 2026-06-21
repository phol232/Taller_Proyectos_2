package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.StudentScheduleGeneration;

import java.util.UUID;

public record StudentScheduleGenerationResponse(
        UUID solverRunId,
        String status,
        String websocketUrl,
        String warning
) {
    public static StudentScheduleGenerationResponse from(StudentScheduleGeneration generation) {
        return new StudentScheduleGenerationResponse(
                generation.solverRunId(),
                generation.status(),
                generation.websocketUrl(),
                generation.warning()
        );
    }
}
