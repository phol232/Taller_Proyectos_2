package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentScheduleBuilderRepository {

    Optional<StudentBuilderDraft> findDraft(UUID studentId, UUID academicPeriodId);

    Optional<StudentBuilderDraft> findDraftBySchedule(UUID studentId, UUID scheduleId);

    UUID ensureDraft(UUID studentId, UUID academicPeriodId, UUID actorId, int ttlSeconds, int maxLiveDrafts);

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
            UUID actorId,
            int ttlSeconds
    );

    void removeCourse(UUID scheduleId, UUID courseId);

    UUID importFromOption(
            UUID studentId,
            UUID academicPeriodId,
            UUID sourceScheduleId,
            UUID actorId,
            int ttlSeconds,
            int maxLiveDrafts
    );

    void renewHolds(UUID scheduleId, int ttlSeconds);
}
