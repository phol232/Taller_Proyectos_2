package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SectionTeacherCandidateRequest(
        @NotNull(message = "El docente candidato es obligatorio")
        UUID teacherId,
        Double priorityWeight
) {}
