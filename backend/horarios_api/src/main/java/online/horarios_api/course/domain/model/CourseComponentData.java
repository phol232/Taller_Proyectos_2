package online.horarios_api.course.domain.model;

import java.math.BigDecimal;

public record CourseComponentData(
        String componentType,
        BigDecimal weeklyHours,
        String requiredRoomType,
        Integer sortOrder,
        Boolean isActive
) {}
