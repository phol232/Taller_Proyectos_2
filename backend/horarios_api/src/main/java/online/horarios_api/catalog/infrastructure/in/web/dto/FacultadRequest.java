package online.horarios_api.catalog.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FacultadRequest(
        @NotBlank(message = "El código es obligatorio")
        @Size(max = 20, message = "Máximo 20 caracteres")
        String code,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 255, message = "Máximo 255 caracteres")
        String name,

        Boolean isActive
) {
}
