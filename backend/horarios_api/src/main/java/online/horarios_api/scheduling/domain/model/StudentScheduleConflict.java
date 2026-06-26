package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record StudentScheduleConflict(
        String conflictType,
        String message,
        UUID resourceId
) {}
