package online.horarios_api.scheduling.domain.model;

import java.time.LocalTime;
import java.util.UUID;

public record TimetableSlot(
        UUID slotId,
        UUID classroomId,
        String classroomCode,
        String classroomName,
        String classroomType,
        UUID teacherId,
        String teacherCode,
        String teacherName,
        UUID courseId,
        String courseCode,
        String courseName,
        String componentType,
        UUID sectionId,
        String nrc,
        int sectionNumber,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
) {}
