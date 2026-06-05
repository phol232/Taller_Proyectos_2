package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.RemovedSlotResult;

import java.math.BigDecimal;
import java.util.UUID;

public record RemovedSlotResponse(
        UUID assignmentId,
        boolean assignmentLeftIncomplete,
        BigDecimal assignedHours,
        BigDecimal requiredHours
) {
    public static RemovedSlotResponse from(RemovedSlotResult r) {
        return new RemovedSlotResponse(
                r.assignmentId(),
                r.assignmentLeftIncomplete(),
                r.assignedHours(),
                r.requiredHours()
        );
    }
}
