package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.GenerationReservation;
import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;
import online.horarios_api.scheduling.domain.model.ScheduleOption;

import java.util.List;
import java.util.UUID;

public interface ScheduleGenerationRepository {
    GenerationReservation reserveGeneration(UUID actorId, UUID academicPeriodId);

    List<ScheduleOption> listOptions(UUID academicPeriodId);

    ScheduleGenerationRun getGenerationRun(UUID runId);

    UUID confirmOption(UUID scheduleId, UUID actorId);

    void cancelOption(UUID scheduleId, UUID actorId);
}
