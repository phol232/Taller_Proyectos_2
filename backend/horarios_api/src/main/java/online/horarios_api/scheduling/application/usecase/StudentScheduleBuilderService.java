package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;
import online.horarios_api.scheduling.domain.port.in.StudentScheduleBuilderUseCase;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.ConflictException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class StudentScheduleBuilderService implements StudentScheduleBuilderUseCase {

    private static final int HOLD_TTL_SECONDS = 300;
    private static final int MAX_LIVE_DRAFTS = 3;

    private final StudentScheduleBuilderRepository repository;

    public StudentScheduleBuilderService(StudentScheduleBuilderRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<StudentBuilderDraft> getDraft(UUID studentId, UUID academicPeriodId) {
        requireIds(studentId, academicPeriodId);
        return repository.findDraft(studentId, academicPeriodId);
    }

    @Override
    public Optional<StudentBuilderDraft> getDraftBySchedule(UUID studentId, UUID scheduleId) {
        if (studentId == null || scheduleId == null) {
            throw new BadRequestException("El estudiante y el horario son obligatorios.");
        }
        return repository.findDraftBySchedule(studentId, scheduleId);
    }

    @Override
    public UUID ensureDraft(UUID studentId, UUID academicPeriodId, UUID actorId) {
        requireActor(studentId, academicPeriodId, actorId);
        return repository.ensureDraft(
                studentId, academicPeriodId, actorId, HOLD_TTL_SECONDS, MAX_LIVE_DRAFTS);
    }

    @Override
    public List<StudentScheduleConflict> validateAddCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds
    ) {
        requireCourseInput(studentId, scheduleId, courseId, assignmentIds);
        return repository.validateAddCourse(studentId, scheduleId, courseId, assignmentIds);
    }

    @Override
    public UUID addCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds,
            UUID actorId
    ) {
        requireCourseInput(studentId, scheduleId, courseId, assignmentIds);
        if (actorId == null) {
            throw new BadRequestException("Usuario autenticado inválido.");
        }

        List<StudentScheduleConflict> conflicts =
                repository.validateAddCourse(studentId, scheduleId, courseId, assignmentIds);
        if (!conflicts.isEmpty()) {
            StudentScheduleConflict first = conflicts.getFirst();
            throw new ConflictException(first.message());
        }

        return repository.addCourse(
                studentId, scheduleId, courseId, assignmentIds, actorId, HOLD_TTL_SECONDS);
    }

    @Override
    public void removeCourse(UUID scheduleId, UUID courseId) {
        if (scheduleId == null || courseId == null) {
            throw new BadRequestException("El horario y el curso son obligatorios.");
        }
        repository.removeCourse(scheduleId, courseId);
    }

    @Override
    public UUID importFromOption(
            UUID studentId,
            UUID academicPeriodId,
            UUID sourceScheduleId,
            UUID actorId
    ) {
        requireActor(studentId, academicPeriodId, actorId);
        if (sourceScheduleId == null) {
            throw new BadRequestException("La opción de origen es obligatoria.");
        }
        return repository.importFromOption(
                studentId, academicPeriodId, sourceScheduleId, actorId,
                HOLD_TTL_SECONDS, MAX_LIVE_DRAFTS);
    }

    @Override
    public void renewDraft(UUID scheduleId) {
        if (scheduleId == null) {
            throw new BadRequestException("El horario es obligatorio.");
        }
        repository.renewHolds(scheduleId, HOLD_TTL_SECONDS);
    }

    private void requireIds(UUID studentId, UUID academicPeriodId) {
        if (studentId == null || academicPeriodId == null) {
            throw new BadRequestException("El estudiante y el período son obligatorios.");
        }
    }

    private void requireActor(UUID studentId, UUID academicPeriodId, UUID actorId) {
        requireIds(studentId, academicPeriodId);
        if (actorId == null) {
            throw new BadRequestException("Usuario autenticado inválido.");
        }
    }

    private void requireCourseInput(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds
    ) {
        if (studentId == null || scheduleId == null || courseId == null) {
            throw new BadRequestException("Estudiante, horario y curso son obligatorios.");
        }
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            throw new BadRequestException("Debe indicar las asignaciones de la sección.");
        }
    }
}
