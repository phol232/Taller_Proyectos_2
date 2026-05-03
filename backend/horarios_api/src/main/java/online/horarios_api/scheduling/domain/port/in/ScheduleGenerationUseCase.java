package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.ScheduleGeneration;
import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;
import online.horarios_api.scheduling.domain.model.ScheduleOption;

import java.util.List;
import java.util.UUID;

public interface ScheduleGenerationUseCase {
    ScheduleGeneration generateOption(UUID actorId, UUID academicPeriodId, List<UUID> classroomIds, Integer timeLimitMs);

    List<ScheduleOption> listOptions(UUID academicPeriodId);

    ScheduleGenerationRun getGenerationRun(UUID runId);

    UUID confirmOption(UUID scheduleId, UUID actorId);

    void cancelOption(UUID scheduleId, UUID actorId);
}
