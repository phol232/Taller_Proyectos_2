package online.horarios_api.teacher.infrastructure.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import online.horarios_api.shared.infrastructure.in.web.dto.AvailabilitySlotRequest;

import java.util.List;
import java.util.UUID;

public record TeacherRequest(
        UUID userId,

        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String fullName,

        @NotBlank(message = "La especialidad es obligatoria")
        String specialty,

        Boolean isActive,

        @Valid
        List<AvailabilitySlotRequest> availability,

        List<String> courseCodes
) {}
