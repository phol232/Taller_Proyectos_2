package online.horarios_api.course.infrastructure.in.web.dto;

import online.horarios_api.course.domain.model.CourseComponent;

import java.util.UUID;

public record CourseComponentResponse(
        UUID id,
        String componentType,
        int weeklyHours,
        String requiredRoomType,
        int sortOrder,
        boolean isActive
) {
    public static CourseComponentResponse from(CourseComponent component) {
        return new CourseComponentResponse(
                component.id(),
                component.componentType(),
                component.weeklyHours(),
                component.requiredRoomType(),
                component.sortOrder(),
                component.isActive()
        );
    }
}
