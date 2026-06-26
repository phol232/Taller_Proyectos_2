package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.SolverRunAccepted;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.scheduling.domain.model.StudentScheduleGeneration;
import online.horarios_api.scheduling.domain.model.StudentScheduleOption;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleUseCase;
import online.horarios_api.scheduling.domain.port.out.SolverClientPort;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class StudentScheduleService implements StudentScheduleUseCase {

    private static final int DEFAULT_TIME_LIMIT_MS = 30_000;
    private static final int HOLD_TTL_SECONDS = 120;

    private final StudentScheduleRepository repository;
    private final SolverClientPort solverClient;
    private final SecureRandom random;

    public StudentScheduleService(StudentScheduleRepository repository, SolverClientPort solverClient) {
        this.repository = repository;
        this.solverClient = solverClient;
        this.random = new SecureRandom();
    }

    @Override
    public List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId) {
        requireIds(studentId, academicPeriodId);
        return repository.listPendingCourses(studentId, academicPeriodId);
    }

    @Override
    public Optional<ActiveStudentSchedule> getActiveSchedule(UUID studentId, UUID academicPeriodId) {
        requireIds(studentId, academicPeriodId);
        return repository.findActiveSchedule(studentId, academicPeriodId);
    }

    @Override
    public StudentScheduleGeneration generateOptions(
            UUID studentId, UUID actorId, UUID academicPeriodId, Integer timeLimitMs) {
        requireIds(studentId, academicPeriodId);
        if (actorId == null) {
            throw new BadRequestException("Usuario autenticado inválido.");
        }

        // Si ya hay borradores vivos, avisamos que caducarán pronto (hold de gracia).
        boolean hadLiveDrafts = !repository.listScheduleOptions(studentId, academicPeriodId).isEmpty();
        String warning = hadLiveDrafts
                ? "Tu horario anterior dejará de estar disponible en " + (HOLD_TTL_SECONDS / 60) + " minutos."
                : null;

        int seed = random.nextInt();
        int limit = timeLimitMs != null ? timeLimitMs : DEFAULT_TIME_LIMIT_MS;
        SolverRunAccepted accepted = solverClient.runStudentSchedule(
                academicPeriodId, actorId, studentId, seed, limit);

        return new StudentScheduleGeneration(
                accepted.solverRunId(), accepted.status(), accepted.websocketUrl(), warning);
    }

    @Override
    public List<StudentScheduleOption> listOptions(UUID studentId, UUID academicPeriodId) {
        requireIds(studentId, academicPeriodId);
        return repository.listScheduleOptions(studentId, academicPeriodId);
    }

    @Override
    public UUID confirmOption(UUID studentId, UUID scheduleId) {
        requireSchedule(studentId, scheduleId);
        repository.confirmSchedule(studentId, scheduleId);
        return scheduleId;
    }

    @Override
    public void renewOption(UUID studentId, UUID scheduleId) {
        requireSchedule(studentId, scheduleId);
        repository.renewHolds(scheduleId, HOLD_TTL_SECONDS);
    }

    @Override
    public void releaseOption(UUID studentId, UUID scheduleId) {
        requireSchedule(studentId, scheduleId);
        repository.releaseOption(scheduleId);
    }

    private void requireIds(UUID studentId, UUID academicPeriodId) {
        if (studentId == null || academicPeriodId == null) {
            throw new BadRequestException("El estudiante y el período son obligatorios.");
        }
    }

    private void requireSchedule(UUID studentId, UUID scheduleId) {
        if (studentId == null || scheduleId == null) {
            throw new BadRequestException("El estudiante y el horario son obligatorios.");
        }
    }
}
