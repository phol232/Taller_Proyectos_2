package online.horarios_api.academicperiod.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AcademicPeriodRequest(
        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String name,

        @NotNull(message = "La fecha de inicio es obligatoria")
        LocalDate startsAt,

        @NotNull(message = "La fecha de fin es obligatoria")
        LocalDate endsAt,

        @NotBlank(message = "El estado es obligatorio")
        String status,

        Integer maxStudentCredits
) {}
