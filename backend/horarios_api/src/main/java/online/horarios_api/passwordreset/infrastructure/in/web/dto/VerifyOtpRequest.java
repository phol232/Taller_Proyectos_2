package online.horarios_api.passwordreset.infrastructure.in.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato válido")
    @Pattern(
        regexp = "^[^@]+@continental\\.edu\\.pe$",
        message = "Solo se permiten correos institucionales @continental.edu.pe"
    )
    String email,

    @NotBlank(message = "El código OTP es obligatorio")
    @Pattern(regexp = "^[0-9]{6}$", message = "El código debe ser numérico de 6 dígitos")
    String otp

) {}
