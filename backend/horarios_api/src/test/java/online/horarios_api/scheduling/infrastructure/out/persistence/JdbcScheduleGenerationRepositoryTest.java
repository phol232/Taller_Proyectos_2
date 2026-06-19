package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.GenerationReservation;
import online.horarios_api.scheduling.domain.model.ScheduleGenerationRun;
import online.horarios_api.scheduling.domain.model.ScheduleOption;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JdbcScheduleGenerationRepository — persistencia real contra Postgres (Testcontainers)")
class JdbcScheduleGenerationRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcScheduleGenerationRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcScheduleGenerationRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("reserveGeneration: primera solicitud del actor es aceptada")
    void reserveGeneration_firstRequest_isAccepted() {
        UUID period = fixtures.academicPeriod();
        UUID actor = fixtures.user("actor@continental.edu.pe");

        GenerationReservation reservation = repository.reserveGeneration(actor, period);

        assertThat(reservation.accepted()).isTrue();
        assertThat(reservation.reservationId()).isNotNull();
        assertThat(reservation.remaining()).isEqualTo(4);
    }

    @Test
    @DisplayName("listOptions: devuelve los horarios DRAFT/CONFIRMED del período con sus métricas")
    void listOptions_returnsScheduleOptions() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period, "DRAFT");
        fixtures.solverRun(period, schedule, "SUCCEEDED");

        List<ScheduleOption> options = repository.listOptions(period);

        assertThat(options).hasSize(1);
        assertThat(options.getFirst().id()).isEqualTo(schedule);
        assertThat(options.getFirst().status()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("getGenerationRun: existente devuelve el run con sus conflictos")
    void getGenerationRun_existing_returnsRunWithConflicts() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period);
        UUID runId = fixtures.solverRun(period, schedule, "FAILED");
        fixtures.solverRunConflict(runId, "TEACHER_OVERLAP", "El docente ya tiene una clase asignada.");

        ScheduleGenerationRun run = repository.getGenerationRun(runId);

        assertThat(run.id()).isEqualTo(runId);
        assertThat(run.status()).isEqualTo("FAILED");
        assertThat(run.conflicts()).hasSize(1);
        assertThat(run.conflicts().getFirst().conflictType()).isEqualTo("TEACHER_OVERLAP");
    }

    @Test
    @DisplayName("getGenerationRun: inexistente lanza NotFoundException")
    void getGenerationRun_missing_throwsNotFound() {
        assertThatThrownBy(() -> repository.getGenerationRun(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("confirmOption: confirma el horario DRAFT y devuelve su id")
    void confirmOption_confirmsDraftSchedule() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period, "DRAFT");
        UUID confirmedBy = fixtures.user("confirmador@continental.edu.pe");

        UUID confirmed = repository.confirmOption(schedule, confirmedBy);

        assertThat(confirmed).isEqualTo(schedule);
    }

    @Test
    @DisplayName("cancelOption: cancela un horario DRAFT")
    void cancelOption_cancelsDraftSchedule() {
        UUID period = fixtures.academicPeriod();
        UUID schedule = fixtures.teachingSchedule(period, "DRAFT");

        repository.cancelOption(schedule, UUID.randomUUID());

        List<ScheduleOption> remaining = repository.listOptions(period);
        assertThat(remaining).isEmpty();
    }
}
