package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.ScheduleAssignmentSlot;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ScheduleAssignmentResponse(
        UUID assignmentId,
        UUID courseId,
        String courseCode,
        String courseName,
        UUID courseComponentId,
        String componentType,
        BigDecimal componentWeeklyHours,
        UUID teacherId,
        String teacherCode,
        String teacherName,
        UUID sectionId,
        String sectionNrc,
        String assignmentStatus,
        BigDecimal assignedHours,
        boolean complete,
        List<SlotResponse> slots
) {
    public record SlotResponse(
            UUID slotId,
            UUID timeSlotId,
            String dayOfWeek,
            String startTime,
            String endTime,
            UUID classroomId,
            String classroomCode,
            String classroomName
    ) {
        public static SlotResponse from(ScheduleAssignmentSlot s) {
            return new SlotResponse(
                    s.slotId(), s.timeSlotId(), s.dayOfWeek(),
                    s.startTime(), s.endTime(),
                    s.classroomId(), s.classroomCode(), s.classroomName()
            );
        }
    }

    public static ScheduleAssignmentResponse from(ScheduleAssignment a) {
        return new ScheduleAssignmentResponse(
                a.assignmentId(), a.courseId(), a.courseCode(), a.courseName(),
                a.courseComponentId(), a.componentType(), a.componentWeeklyHours(),
                a.teacherId(), a.teacherCode(), a.teacherName(),
                a.sectionId(), a.sectionNrc(),
                a.assignmentStatus(), a.assignedHours(), a.complete(),
                a.slots().stream().map(SlotResponse::from).toList()
        );
    }
}
