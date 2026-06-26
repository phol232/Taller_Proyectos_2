package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;

import java.util.UUID;

public record StudentScheduleConflictResponse(
        String conflictType,
        String message,
        UUID resourceId
) {
    public static StudentScheduleConflictResponse from(StudentScheduleConflict conflict) {
        return new StudentScheduleConflictResponse(
                conflict.conflictType(),
                conflict.message(),
                conflict.resourceId()
        );
    }
}
