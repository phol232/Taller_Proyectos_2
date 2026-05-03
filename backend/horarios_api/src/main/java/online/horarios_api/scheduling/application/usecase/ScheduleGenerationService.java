package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.exception.GenerationRateLimitException;
import online.horarios_api.scheduling.domain.model.GenerationReservation;
import online.horarios_api.scheduling.domain.model.ScheduleGeneration;
import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;
import online.horarios_api.scheduling.domain.model.ScheduleOption;
import online.horarios_api.scheduling.domain.model.SolverRunAccepted;
import online.horarios_api.scheduling.domain.port.in.ScheduleGenerationUseCase;
import online.horarios_api.scheduling.domain.port.out.ScheduleGenerationRepository;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.shared.domain.exception.BadRequestException;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

public class ScheduleGenerationService implements ScheduleGenerationUseCase {

    private static final int DEFAULT_TIME_LIMIT_MS = 30_000;

    private final ScheduleGenerationRepository repository;
    private final SolverClientPort solverClient;
    private final SecureRandom random;

    public ScheduleGenerationService(
            ScheduleGenerationRepository repository,
            SolverClientPort solverClient,
            SecureRandom random
    ) {
        this.repository = repository;
        this.solverClient = solverClient;
        this.random = random;
    }

    @Override
    public ScheduleGeneration generateOption(
            UUID actorId,
            UUID academicPeriodId,
            List<UUID> classroomIds,
            Integer timeLimitMs
    ) {
        if (actorId == null) {
            throw new BadRequestException("Usuario autenticado inválido.");
        }
        if (academicPeriodId == null) {
            throw new BadRequestException("El período académico es obligatorio.");
        }
        if (classroomIds == null || classroomIds.isEmpty()) {
            throw new BadRequestException("Selecciona al menos un aula para generar el horario.");
        }

        GenerationReservation reservation = repository.reserveGeneration(actorId, academicPeriodId);
        if (!reservation.accepted()) {
            throw new GenerationRateLimitException(
                    "Límite de generación alcanzado. Intenta nuevamente más tarde.",
                    reservation.retryAfterSeconds(),
                    reservation.remaining()
            );
        }

        int seed = random.nextInt();
        int limit = timeLimitMs != null ? timeLimitMs : DEFAULT_TIME_LIMIT_MS;
        SolverRunAccepted accepted = solverClient.runTeacherSchedule(
                academicPeriodId,
                actorId,
                seed,
                limit,
                reservation.reservationId(),
                classroomIds
        );
        return new ScheduleGeneration(
                accepted.solverRunId(),
                reservation.reservationId(),
                seed,
                reservation.remaining(),
                accepted.status(),
                accepted.websocketUrl()
        );
    }

    @Override
    public List<ScheduleOption> listOptions(UUID academicPeriodId) {
        return repository.listOptions(academicPeriodId);
    }

    @Override
    public ScheduleGenerationRun getGenerationRun(UUID runId) {
        return repository.getGenerationRun(runId);
    }

    @Override
    public UUID confirmOption(UUID scheduleId, UUID actorId) {
        return repository.confirmOption(scheduleId, actorId);
    }

    @Override
    public void cancelOption(UUID scheduleId, UUID actorId) {
        repository.cancelOption(scheduleId, actorId);
    }
}
