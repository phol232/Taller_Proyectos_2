package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.TimetableSlot;

import java.util.UUID;

public record TimetableSlotResponse(
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
        String startTime,
        String endTime
) {
    public static TimetableSlotResponse from(TimetableSlot s) {
        return new TimetableSlotResponse(
                s.slotId(),
                s.classroomId(),
                s.classroomCode(),
                s.classroomName(),
                s.classroomType(),
                s.teacherId(),
                s.teacherCode(),
                s.teacherName(),
                s.courseId(),
                s.courseCode(),
                s.courseName(),
                s.componentType(),
                s.sectionId(),
                s.nrc(),
                s.sectionNumber(),
                s.dayOfWeek(),
                s.startTime().toString(),
                s.endTime().toString()
        );
    }
}
