package online.horarios_api.passwordreset.dto;

/**
 * Respuesta al verificar correctamente el OTP.
 * El resetToken debe usarse en el endpoint /reset-password.
 */
public record VerifyOtpResponse(String resetToken) {}
