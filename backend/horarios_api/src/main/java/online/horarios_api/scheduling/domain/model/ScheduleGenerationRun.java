package online.horarios_api.scheduling.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ScheduleGenerationRun(
        UUID id,
        String runType,
        UUID academicPeriodId,
        UUID studentId,
        UUID teachingScheduleId,
        String status,
        UUID requestedBy,
        Integer seed,
        Integer timeLimitMs,
        String inputHash,
        String resultSummary,
        Instant startedAt,
        Instant finishedAt,
        Instant createdAt,
        List<Conflict> conflicts
) {
    public record Conflict(
            String conflictType,
            String resourceType,
            UUID resourceId,
            UUID courseId,
            UUID timeSlotId,
            String message,
            Instant createdAt
    ) {}
}
