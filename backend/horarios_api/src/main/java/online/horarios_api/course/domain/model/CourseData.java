package online.horarios_api.course.domain.model;

import java.util.List;

public record CourseData(
        String code,
        String name,
        int credits,
        int weeklyHours,
        String requiredRoomType,
        Boolean isActive,
        List<String> prerequisites
) {}
