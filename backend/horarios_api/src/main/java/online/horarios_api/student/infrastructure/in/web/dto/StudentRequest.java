package online.horarios_api.student.infrastructure.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record StudentRequest(
        UUID userId,

        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String fullName,

        @Min(value = 1, message = "El ciclo debe ser mayor a 0")
        Integer cycle,

        String career,

        @Min(value = 1, message = "El límite de créditos debe ser mayor a 0")
        Integer creditLimit,

        Boolean isActive,
        UUID facultadId,
        UUID carreraId,
        List<String> approvedCourses
) {}
