package online.horarios_api.course.infrastructure.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CourseComponentRequest(
        @NotBlank(message = "El tipo de componente es obligatorio")
        String componentType,

        @Min(value = 1, message = "Las horas del componente deben ser mayores o iguales a 1")
        Integer weeklyHours,

        String requiredRoomType,

        @Min(value = 1, message = "El orden debe ser mayor o igual a 1")
        Integer sortOrder,

        Boolean isActive
) {}
