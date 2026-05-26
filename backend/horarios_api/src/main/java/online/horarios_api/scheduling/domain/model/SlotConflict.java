package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record SlotConflict(
        String conflictType,
        UUID resourceId,
        String message
) {}
