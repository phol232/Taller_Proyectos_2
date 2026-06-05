package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;

import java.util.List;
import java.util.UUID;

public record ActiveStudentScheduleResponse(
        UUID scheduleId,
        String status,
        List<ItemResponse> items
) {
    public record ItemResponse(
            UUID studentScheduleItemId,
            UUID courseId,
            List<ComponentResponse> components
    ) {
        public static ItemResponse from(ActiveStudentSchedule.StudentScheduleItem i) {
            return new ItemResponse(
                    i.studentScheduleItemId(),
                    i.courseId(),
                    i.components().stream().map(ComponentResponse::from).toList()
            );
        }
    }

    public record ComponentResponse(
            UUID courseComponentId,
            UUID courseAssignmentId
    ) {
        public static ComponentResponse from(ActiveStudentSchedule.StudentScheduleItemComponent c) {
            return new ComponentResponse(c.courseComponentId(), c.courseAssignmentId());
        }
    }

    public static ActiveStudentScheduleResponse from(ActiveStudentSchedule s) {
        return new ActiveStudentScheduleResponse(
                s.scheduleId(),
                s.status(),
                s.items().stream().map(ItemResponse::from).toList()
        );
    }
}
