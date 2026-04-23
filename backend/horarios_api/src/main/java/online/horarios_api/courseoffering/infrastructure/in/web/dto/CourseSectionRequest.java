package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CourseSectionRequest(
        @NotBlank(message = "El código de sección es obligatorio")
        String sectionCode,

        @Min(value = 1, message = "La vacante de la sección debe ser mayor a 0")
        Integer vacancyLimit,

        @NotBlank(message = "El estado de la sección es obligatorio")
        String status,

        @Valid
        List<SectionTeacherCandidateRequest> teacherCandidates
) {}
