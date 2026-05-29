package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.SlotConflict;

import java.util.UUID;

public record SlotConflictResponse(
        String conflictType,
        UUID resourceId,
        String message
) {
    public static SlotConflictResponse from(SlotConflict c) {
        return new SlotConflictResponse(c.conflictType(), c.resourceId(), c.message());
    }
}
