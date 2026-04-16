package online.horarios_api.passwordreset.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ForgotPasswordRequest(

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato válido")
    @Pattern(
        regexp = "^[^@]+@continental\\.edu\\.pe$",
        message = "Solo se permiten correos institucionales @continental.edu.pe"
    )
    String email

) {}
