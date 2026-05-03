package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ScheduleGenerationRunResponse(
        UUID solverRunId,
        String runType,
        UUID academicPeriodId,
        UUID teachingScheduleId,
        String status,
        Integer seed,
        String summary,
        Instant startedAt,
        Instant finishedAt,
        Instant createdAt,
        List<ConflictResponse> conflicts
) {
    public static ScheduleGenerationRunResponse from(ScheduleGenerationRun run) {
        return new ScheduleGenerationRunResponse(
                run.id(),
                run.runType(),
                run.academicPeriodId(),
                run.teachingScheduleId(),
                run.status(),
                run.seed(),
                run.resultSummary(),
                run.startedAt(),
                run.finishedAt(),
                run.createdAt(),
                run.conflicts().stream().map(ConflictResponse::from).toList()
        );
    }

    public record ConflictResponse(
            String conflictType,
            String resourceType,
            UUID resourceId,
            UUID courseId,
            UUID timeSlotId,
            String message,
            Instant createdAt
    ) {
        public static ConflictResponse from(ScheduleGenerationRun.Conflict conflict) {
            return new ConflictResponse(
                    conflict.conflictType(),
                    conflict.resourceType(),
                    conflict.resourceId(),
                    conflict.courseId(),
                    conflict.timeSlotId(),
                    conflict.message(),
                    conflict.createdAt()
            );
        }
    }
}
