package online.horarios_api.course.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record CourseComponentRequest(
        @NotBlank(message = "El tipo de componente es obligatorio")
        String componentType,

        @DecimalMin(value = "0.1", message = "Las horas del componente deben ser mayores a 0")
        @Digits(integer = 2, fraction = 1, message = "Las horas del componente deben tener máximo 1 decimal")
        BigDecimal weeklyHours,

        String requiredRoomType,

        @Min(value = 1, message = "El orden debe ser mayor o igual a 1")
        Integer sortOrder,

        Boolean isActive
) {}
