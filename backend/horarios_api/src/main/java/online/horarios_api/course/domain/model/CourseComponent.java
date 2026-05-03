package online.horarios_api.course.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public record CourseComponent(
        UUID id,
        String componentType,
        BigDecimal weeklyHours,
        String requiredRoomType,
        int sortOrder,
        boolean isActive
) {}
