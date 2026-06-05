package online.horarios_api.scheduling.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public record RemovedSlotResult(
        UUID assignmentId,
        boolean assignmentLeftIncomplete,
        BigDecimal assignedHours,
        BigDecimal requiredHours
) {}
