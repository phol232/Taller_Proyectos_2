package online.horarios_api.passwordreset.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import online.horarios_api.passwordreset.dto.ForgotPasswordRequest;
import online.horarios_api.passwordreset.dto.ResetPasswordRequest;
import online.horarios_api.passwordreset.dto.VerifyOtpRequest;
import online.horarios_api.passwordreset.dto.VerifyOtpResponse;
import online.horarios_api.passwordreset.service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/password-reset")
@RequiredArgsConstructor
@Tag(name = "Recuperación de contraseña", description = "Flujo OTP por correo electrónico")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @Operation(
        summary = "Paso 1 — Solicitar código OTP",
        description = "Recibe el correo, valida rate-limit y envía un OTP de 6 dígitos (10 min). " +
                      "Respuesta genérica para no revelar si el correo existe."
    )
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> requestOtp(
            @Valid @RequestBody ForgotPasswordRequest request) {

        String message = passwordResetService.requestOtp(request.email());
        return ResponseEntity.ok(Map.of("message", message));
    }

    @Operation(
        summary = "Paso 2 — Verificar código OTP",
        description = "Valida el código ingresado. Si es correcto, devuelve un resetToken " +
                      "de un solo uso para el paso siguiente."
    )
    @PostMapping("/verify")
    public ResponseEntity<VerifyOtpResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        VerifyOtpResponse response = passwordResetService.verifyOtp(request.email(), request.otp());
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Paso 3 — Restablecer contraseña",
        description = "Usa el resetToken obtenido en el paso 2 para actualizar la contraseña. " +
                      "El token es de un solo uso y expira junto al OTP."
    )
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(request.resetToken(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente."));
    }
}
