package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ScheduleOption;

import java.time.Instant;
import java.util.UUID;

public record ScheduleOptionResponse(
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
) {
    public static ScheduleOptionResponse from(ScheduleOption option) {
        return new ScheduleOptionResponse(
                option.id(),
                option.academicPeriodId(),
                option.status(),
                option.createdBy(),
                option.createdAt(),
                option.updatedAt(),
                option.confirmedAt(),
                option.solverRunId(),
                option.seed(),
                option.offerCount(),
                option.slotCount()
        );
    }
}
