package online.horarios_api.course.domain.model;

import java.util.List;

public record CourseData(
        String code,
        String name,
        Integer cycle,
        int credits,
        Integer requiredCredits,
        int weeklyHours,
        String requiredRoomType,
        Boolean isActive,
        List<CourseComponentData> components,
        List<String> prerequisites
) {}
