package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentScheduleBuilderUseCase {

    Optional<StudentBuilderDraft> getDraft(UUID studentId, UUID academicPeriodId);

    Optional<StudentBuilderDraft> getDraftBySchedule(UUID studentId, UUID scheduleId);

    UUID ensureDraft(UUID studentId, UUID academicPeriodId, UUID actorId);

    List<StudentScheduleConflict> validateAddCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds
    );

    UUID addCourse(
            UUID studentId,
            UUID scheduleId,
            UUID courseId,
            List<UUID> assignmentIds,
            UUID actorId
    );

    void removeCourse(UUID scheduleId, UUID courseId);

    UUID importFromOption(
            UUID studentId,
            UUID academicPeriodId,
            UUID sourceScheduleId,
            UUID actorId
    );

    void renewDraft(UUID scheduleId);
}
