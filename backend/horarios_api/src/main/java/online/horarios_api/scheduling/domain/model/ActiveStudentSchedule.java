package online.horarios_api.scheduling.domain.model;

import java.util.List;
import java.util.UUID;

public record ActiveStudentSchedule(
        UUID scheduleId,
        String status,
        List<StudentScheduleItem> items
) {
    public record StudentScheduleItem(
            UUID studentScheduleItemId,
            UUID courseId,
            List<StudentScheduleItemComponent> components
    ) {}

    public record StudentScheduleItemComponent(
            UUID courseComponentId,
            UUID courseAssignmentId
    ) {}
}
