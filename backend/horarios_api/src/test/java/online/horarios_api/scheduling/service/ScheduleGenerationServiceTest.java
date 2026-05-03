package online.horarios_api.scheduling.service;

import online.horarios_api.scheduling.application.usecase.ScheduleGenerationService;
import online.horarios_api.scheduling.domain.exception.GenerationRateLimitException;
import online.horarios_api.scheduling.domain.model.GenerationReservation;
import online.horarios_api.scheduling.domain.model.ScheduleGeneration;
import online.horarios_api.scheduling.domain.model.SolverRunAccepted;
import online.horarios_api.scheduling.domain.port.out.ScheduleGenerationRepository;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("ScheduleGenerationService")
class ScheduleGenerationServiceTest {

    private final ScheduleGenerationRepository repository = mock(ScheduleGenerationRepository.class);
    private final SolverClientPort solverClient = mock(SolverClientPort.class);
    private final ScheduleGenerationService service = new ScheduleGenerationService(
            repository,
            solverClient,
            new SecureRandom()
    );

    @Test
    @DisplayName("generateOption: reserva aceptada llama al solver con actor real y reserva")
    void generateOptionAcceptedCallsSolver() {
        UUID actorId = UUID.randomUUID();
        UUID periodId = UUID.randomUUID();
        UUID reservationId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();
        List<UUID> classroomIds = List.of(UUID.randomUUID(), UUID.randomUUID());

        when(repository.reserveGeneration(actorId, periodId))
                .thenReturn(new GenerationReservation(reservationId, true, 0, 4));
        when(solverClient.runTeacherSchedule(eq(periodId), eq(actorId), anyInt(), eq(45_000), eq(reservationId), eq(classroomIds)))
                .thenReturn(new SolverRunAccepted(runId, "PENDING", "/api/solver/ws/runs/" + runId));

        ScheduleGeneration result = service.generateOption(actorId, periodId, classroomIds, 45_000);

        assertThat(result.solverRunId()).isEqualTo(runId);
        assertThat(result.reservationId()).isEqualTo(reservationId);
        assertThat(result.remaining()).isEqualTo(4);
        verify(solverClient).runTeacherSchedule(eq(periodId), eq(actorId), anyInt(), eq(45_000), eq(reservationId), eq(classroomIds));
    }

    @Test
    @DisplayName("generateOption: reserva rechazada lanza 429 con retryAfter y remaining")
    void generateOptionRateLimitedThrows() {
        UUID actorId = UUID.randomUUID();
        UUID periodId = UUID.randomUUID();

        when(repository.reserveGeneration(actorId, periodId))
                .thenReturn(new GenerationReservation(null, false, 77, 0));

        assertThatThrownBy(() -> service.generateOption(actorId, periodId, List.of(UUID.randomUUID()), null))
                .isInstanceOfSatisfying(GenerationRateLimitException.class, ex -> {
                    assertThat(ex.getRetryAfterSeconds()).isEqualTo(77);
                    assertThat(ex.getRemaining()).isZero();
                });
    }
}
