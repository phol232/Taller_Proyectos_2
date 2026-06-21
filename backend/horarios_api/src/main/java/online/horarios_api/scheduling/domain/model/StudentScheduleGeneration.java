package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

/**
 * Resultado de disparar la generación de un horario de estudiante.
 * {@code warning} avisa cuando ya existían borradores vivos que caducarán.
 */
public record StudentScheduleGeneration(
        UUID solverRunId,
        String status,
        String websocketUrl,
        String warning
) {}
