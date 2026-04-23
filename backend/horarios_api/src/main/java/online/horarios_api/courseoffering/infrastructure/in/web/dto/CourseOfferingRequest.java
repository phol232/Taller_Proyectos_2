package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CourseOfferingRequest(
        @NotNull(message = "El período académico es obligatorio")
        UUID academicPeriodId,

        @NotNull(message = "El curso es obligatorio")
        UUID courseId,

        @Min(value = 0, message = "La matrícula esperada no puede ser negativa")
        Integer expectedEnrollment,

        @NotBlank(message = "El estado es obligatorio")
        String status,

        @Valid
        List<CourseSectionRequest> sections
) {}
