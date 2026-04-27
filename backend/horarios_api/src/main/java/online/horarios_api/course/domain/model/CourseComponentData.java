package online.horarios_api.course.domain.model;

public record CourseComponentData(
        String componentType,
        int weeklyHours,
        String requiredRoomType,
        Integer sortOrder,
        Boolean isActive
) {}
