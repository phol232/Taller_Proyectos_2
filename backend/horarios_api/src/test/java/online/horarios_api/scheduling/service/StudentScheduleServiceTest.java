package online.horarios_api.scheduling.service;

import online.horarios_api.scheduling.application.usecase.StudentScheduleService;
import online.horarios_api.scheduling.domain.model.SolverRunAccepted;
import online.horarios_api.scheduling.domain.model.StudentScheduleGeneration;
import online.horarios_api.scheduling.domain.model.StudentScheduleOption;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("StudentScheduleService")
class StudentScheduleServiceTest {

    private final StudentScheduleRepository repository = mock(StudentScheduleRepository.class);
    private final SolverClientPort solverClient = mock(SolverClientPort.class);
    private final StudentScheduleService service = new StudentScheduleService(repository, solverClient);

    @Test
    @DisplayName("generateOptions sin borradores previos: sin aviso y llama al solver")
    void generateWithoutPreviousDraftsHasNoWarning() {
        UUID studentId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID periodId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        when(repository.listScheduleOptions(studentId, periodId)).thenReturn(List.of());
        when(solverClient.runStudentSchedule(eq(periodId), eq(actorId), eq(studentId), anyInt(), anyInt()))
                .thenReturn(new SolverRunAccepted(runId, "PENDING", "/ws/" + runId));

        StudentScheduleGeneration result = service.generateOptions(studentId, actorId, periodId, null);

        assertThat(result.solverRunId()).isEqualTo(runId);
        assertThat(result.warning()).isNull();
        verify(solverClient).runStudentSchedule(eq(periodId), eq(actorId), eq(studentId), anyInt(), anyInt());
    }

    @Test
    @DisplayName("generateOptions con borradores vivos: devuelve aviso de gracia")
    void generateWithLiveDraftsReturnsWarning() {
        UUID studentId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID periodId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        when(repository.listScheduleOptions(studentId, periodId)).thenReturn(List.of(
                new StudentScheduleOption(UUID.randomUUID(), 1, "DRAFT",
                        Instant.now(), Instant.now().plusSeconds(120), 120, 5)
        ));
        when(solverClient.runStudentSchedule(eq(periodId), eq(actorId), eq(studentId), anyInt(), anyInt()))
                .thenReturn(new SolverRunAccepted(runId, "PENDING", "/ws/" + runId));

        StudentScheduleGeneration result = service.generateOptions(studentId, actorId, periodId, null);

        assertThat(result.warning()).isNotNull();
    }

    @Test
    @DisplayName("confirmOption delega en el repo y devuelve el scheduleId")
    void confirmDelegates() {
        UUID studentId = UUID.randomUUID();
        UUID scheduleId = UUID.randomUUID();
        when(repository.confirmSchedule(studentId, scheduleId)).thenReturn("CONFIRMED");

        UUID result = service.confirmOption(studentId, scheduleId);

        assertThat(result).isEqualTo(scheduleId);
        verify(repository).confirmSchedule(studentId, scheduleId);
    }
}
