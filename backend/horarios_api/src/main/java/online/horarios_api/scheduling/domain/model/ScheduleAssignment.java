package online.horarios_api.scheduling.domain.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ScheduleAssignment(
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
        List<ScheduleAssignmentSlot> slots
) {}
