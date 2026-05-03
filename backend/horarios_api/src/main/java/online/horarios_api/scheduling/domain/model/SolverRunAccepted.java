package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record SolverRunAccepted(
        UUID solverRunId,
        String status,
        String websocketUrl
) {}
