package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.CourseSection;

import java.util.UUID;

public record CourseSectionResponse(
        UUID id,
        UUID teachingScheduleId,
        UUID courseId,
        String courseCode,
        String courseName,
        String nrc,
        int sectionNumber
) {
    public static CourseSectionResponse from(CourseSection section) {
        return new CourseSectionResponse(
                section.id(),
                section.teachingScheduleId(),
                section.courseId(),
                section.courseCode(),
                section.courseName(),
                section.nrc(),
                section.sectionNumber()
        );
    }
}
