package online.horarios_api.course.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Course(
        UUID id,
        String code,
        String name,
        int cycle,
        int credits,
        int requiredCredits,
        int weeklyHours,
        String requiredRoomType,
        boolean isActive,
        List<CourseComponent> components,
        List<String> prerequisites,
        Instant createdAt,
        Instant updatedAt
) {}
