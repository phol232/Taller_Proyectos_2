package online.horarios_api.course.infrastructure.in.web.dto;

import online.horarios_api.course.domain.model.Course;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseResponse(
        UUID id,
        String code,
        String name,
        int cycle,
        int credits,
        int requiredCredits,
        int weeklyHours,
        String requiredRoomType,
        boolean isActive,
        List<CourseComponentResponse> components,
        List<String> prerequisites,
        Instant createdAt,
        Instant updatedAt
) {

    public static CourseResponse from(Course course) {
        return new CourseResponse(
                course.id(),
                course.code(),
                course.name(),
                course.cycle(),
                course.credits(),
                course.requiredCredits(),
                course.weeklyHours(),
                course.requiredRoomType(),
                course.isActive(),
                course.components().stream().map(CourseComponentResponse::from).toList(),
                course.prerequisites(),
                course.createdAt(),
                course.updatedAt()
        );
    }
}
