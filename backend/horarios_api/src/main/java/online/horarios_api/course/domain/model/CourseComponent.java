package online.horarios_api.course.domain.model;

import java.util.UUID;

public record CourseComponent(
        UUID id,
        String componentType,
        int weeklyHours,
        String requiredRoomType,
        int sortOrder,
        boolean isActive
) {}
