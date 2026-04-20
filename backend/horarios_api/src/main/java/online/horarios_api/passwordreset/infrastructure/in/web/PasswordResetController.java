package online.horarios_api.passwordreset.infrastructure.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.passwordreset.domain.model.OtpVerificationResult;
import online.horarios_api.passwordreset.domain.port.in.RequestOtpUseCase;
import online.horarios_api.passwordreset.domain.port.in.ResetPasswordUseCase;
import online.horarios_api.passwordreset.domain.port.in.VerifyOtpUseCase;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.ForgotPasswordRequest;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.ResetPasswordRequest;
import online.horarios_api.passwordreset.infrastructure.in.web.dto.VerifyOtpRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/password-reset")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Recuperación de contraseña", description = "Flujo OTP por correo electrónico")
public class PasswordResetController {

    private final RequestOtpUseCase   requestOtpUseCase;
    private final VerifyOtpUseCase    verifyOtpUseCase;
    private final ResetPasswordUseCase resetPasswordUseCase;

    @Operation(
        summary = "Paso 1 — Solicitar código OTP",
        description = "Recibe el correo, valida rate-limit y envía un OTP de 6 dígitos (10 min). " +
                      "Respuesta genérica para no revelar si el correo existe."
    )
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> requestOtp(
            @Valid @RequestBody ForgotPasswordRequest request) {

        log.info("[password-reset][request] solicitud recibida email={}", maskEmail(request.email()));

        try {
            String message = requestOtpUseCase.requestOtp(request.email());
            log.info("[password-reset][request] solicitud procesada email={}", maskEmail(request.email()));
            return ResponseEntity.ok(Map.of("message", message));
        } catch (RuntimeException ex) {
            log.warn("[password-reset][request] solicitud rechazada email={} motivo={}",
                    maskEmail(request.email()), ex.getMessage());
            throw ex;
        }
    }

    @Operation(
        summary = "Paso 2 — Verificar código OTP",
        description = "Valida el código ingresado. Si es correcto, devuelve un resetToken " +
                      "de un solo uso para el paso siguiente."
    )
    @PostMapping("/verify")
    public ResponseEntity<OtpVerificationResult> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        log.info("[password-reset][verify] request recibida email={} otpLength={}",
            maskEmail(request.email()), request.otp() == null ? 0 : request.otp().length());

        try {
            OtpVerificationResult result = verifyOtpUseCase.verifyOtp(request.email(), request.otp());
            log.info("[password-reset][verify] OTP validado email={} resetTokenEmitido=true",
                maskEmail(request.email()));
            return ResponseEntity.ok(result);
        } catch (RuntimeException ex) {
            log.warn("[password-reset][verify] OTP rechazado email={} motivo={}",
                maskEmail(request.email()), ex.getMessage());
            throw ex;
        }
    }

    @Operation(
        summary = "Paso 3 — Restablecer contraseña",
        description = "Usa el resetToken obtenido en el paso 2 para actualizar la contraseña."
    )
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        log.info("[password-reset][reset] request recibida resetTokenLength={} newPasswordLength={}",
                request.resetToken() == null ? 0 : request.resetToken().length(),
                request.newPassword() == null ? 0 : request.newPassword().length());

        try {
            resetPasswordUseCase.resetPassword(request.resetToken(), request.newPassword());
            log.info("[password-reset][reset] contraseña actualizada correctamente");
            return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente."));
        } catch (RuntimeException ex) {
            log.warn("[password-reset][reset] cambio rechazado motivo={}", ex.getMessage());
            throw ex;
        }
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "<empty>";
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(atIndex, 0));
        }

        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }
}
