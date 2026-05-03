package online.horarios_api.scheduling.domain.model;

import java.time.Instant;
import java.util.UUID;

public record ScheduleOption(
        UUID id,
        UUID academicPeriodId,
        String status,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt,
        Instant confirmedAt,
        UUID solverRunId,
        Integer seed,
        int offerCount,
        int slotCount
) {}
