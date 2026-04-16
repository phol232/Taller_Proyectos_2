package online.horarios_api.passwordreset.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato válido")
    String email,

    @NotBlank(message = "El código OTP es obligatorio")
    @Pattern(regexp = "^[0-9]{6}$", message = "El código debe ser numérico de 6 dígitos")
    String otp

) {}
