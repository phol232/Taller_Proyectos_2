package online.horarios_api.user.infrastructure.in.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.infrastructure.in.web.validation.ValidUserPassword;

public record CreateUserRequest(

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email debe tener un formato válido")
        @Size(max = 255, message = "El email no puede superar 255 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres")
        @ValidUserPassword
        String password,

        @NotBlank(message = "El nombre completo es obligatorio")
        @Size(max = 255, message = "El nombre completo no puede superar 255 caracteres")
        String fullName,

        @NotNull(message = "El rol es obligatorio")
        Role role,

        boolean active,

        boolean emailVerified
) {}
