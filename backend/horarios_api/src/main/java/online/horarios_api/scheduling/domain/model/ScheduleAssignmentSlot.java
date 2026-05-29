package online.horarios_api.scheduling.domain.model;

import java.util.UUID;

public record ScheduleAssignmentSlot(
        UUID slotId,
        UUID timeSlotId,
        String dayOfWeek,
        String startTime,
        String endTime,
        UUID classroomId,
        String classroomCode,
        String classroomName
) {}
