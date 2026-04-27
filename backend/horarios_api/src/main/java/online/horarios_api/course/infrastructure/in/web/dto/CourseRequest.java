package online.horarios_api.course.infrastructure.in.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;

import java.util.List;

public record CourseRequest(
        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String name,

        @Min(value = 1, message = "El ciclo debe ser mayor o igual a 1")
        @Max(value = 10, message = "El ciclo no puede superar 10")
        Integer cycle,

        @Min(value = 1, message = "Los créditos deben ser mayores o iguales a 1")
        @Max(value = 6, message = "Los créditos no pueden superar 6")
        Integer credits,

        @Min(value = 0, message = "Los créditos requeridos no pueden ser negativos")
        Integer requiredCredits,

        @Min(value = 1, message = "Las horas semanales deben ser mayores o iguales a 1")
        Integer weeklyHours,

        @NotBlank(message = "El tipo de aula requerido es obligatorio")
        String requiredRoomType,
        Boolean isActive,
        @Valid
        List<CourseComponentRequest> components,
        List<String> prerequisites
) {}
