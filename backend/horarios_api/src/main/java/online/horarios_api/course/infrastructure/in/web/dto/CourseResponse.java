package online.horarios_api.course.infrastructure.in.web.dto;

import online.horarios_api.course.domain.model.Course;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseResponse(
        UUID id,
        String code,
        String name,
        int credits,
        int weeklyHours,
        String requiredRoomType,
        boolean isActive,
        List<String> prerequisites,
        Instant createdAt,
        Instant updatedAt
) {

    public static CourseResponse from(Course course) {
        return new CourseResponse(
                course.id(),
                course.code(),
                course.name(),
                course.credits(),
                course.weeklyHours(),
                course.requiredRoomType(),
                course.isActive(),
                course.prerequisites(),
                course.createdAt(),
                course.updatedAt()
        );
    }
}
