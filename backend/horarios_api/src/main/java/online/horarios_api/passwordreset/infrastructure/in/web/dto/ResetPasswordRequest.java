package online.horarios_api.passwordreset.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import online.horarios_api.passwordreset.infrastructure.in.web.validation.ValidResetPassword;

public record ResetPasswordRequest(

    @NotBlank(message = "El token de reset es obligatorio")
    String resetToken,

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    @ValidResetPassword
    String newPassword

) {}
