package online.horarios_api.course.infrastructure.in.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CourseRequest(
        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String name,

        @Min(value = 1, message = "Los créditos deben ser mayores o iguales a 1")
        @Max(value = 6, message = "Los créditos no pueden superar 6")
        Integer credits,

        @Min(value = 1, message = "Las horas semanales deben ser mayores o iguales a 1")
        Integer weeklyHours,

        String requiredRoomType,
        Boolean isActive,
        List<String> prerequisites
) {}
