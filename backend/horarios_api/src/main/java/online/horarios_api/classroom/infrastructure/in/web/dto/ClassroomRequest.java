package online.horarios_api.classroom.infrastructure.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import online.horarios_api.shared.infrastructure.in.web.dto.AvailabilitySlotRequest;

import java.util.List;
import java.util.UUID;

public record ClassroomRequest(
        @NotBlank(message = "El código es obligatorio")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        String name,

        @Min(value = 1, message = "La capacidad debe ser mayor a 0")
        Integer capacity,

        @NotBlank(message = "El tipo es obligatorio")
        String type,

        Boolean isActive,

        @Valid
        List<AvailabilitySlotRequest> availability,

        List<String> courseCodes,

        List<UUID> courseComponentIds
) {}
