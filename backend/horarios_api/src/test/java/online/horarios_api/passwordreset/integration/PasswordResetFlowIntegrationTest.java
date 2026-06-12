package online.horarios_api.passwordreset.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import online.horarios_api.passwordreset.domain.model.PasswordResetToken;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.integration.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Prueba el flujo completo de recuperación de contraseña:
 * HTTP → Seguridad (endpoint público) → Controlador → Servicio real → Puertos mockeados.
 *
 * Diferencia clave con las pruebas unitarias: aquí el contexto Spring completo
 * está activo — Bean Validation, global exception handler y mapeo de rutas son reales.
 */
@DisplayName("Password Reset — integración (flujo OTP completo)")
class PasswordResetFlowIntegrationTest extends IntegrationTest {

    private final ObjectMapper json = new ObjectMapper();
    private static final String EMAIL = "alumno@continental.edu.pe";
    private static final String BASE_URL = "/api/auth/password-reset";

    // ── Paso 1: Solicitar OTP ─────────────────────────────────────────────

    @Test
    @DisplayName("Paso 1 — POST /request: email institucional válido → 200 con mensaje genérico")
    void requestOtp_validEmail_returns200() throws Exception {
        UUID userId = UUID.randomUUID();
        UserInfo userInfo = new UserInfo(userId, EMAIL, "Alumno Test", "STUDENT", null);

        when(userReadPort.findActiveUserInfoByEmail(EMAIL)).thenReturn(Optional.of(userInfo));
        when(passwordResetConfigPort.getMaxRequestsPerWindow()).thenReturn(3);
        when(passwordResetConfigPort.getRateLimitWindowMinutes()).thenReturn(15);
        when(passwordResetTokenPort.countRecentByUserId(any(UUID.class), any(Instant.class))).thenReturn(0L);
        when(otpGeneratorPort.generateOtp()).thenReturn("123456");
        when(passwordHasherPort.encode("123456")).thenReturn("$2a$hashed-otp");
        when(passwordResetConfigPort.getOtpExpiryMinutes()).thenReturn(10);
        when(passwordResetTokenPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post(BASE_URL + "/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    @DisplayName("Paso 1 — POST /request: email externo (no institucional) → 400 por Bean Validation")
    void requestOtp_externalEmail_returns400() throws Exception {
        mockMvc.perform(post(BASE_URL + "/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "alumno@gmail.com"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Paso 1 — POST /request: email vacío → 400 por Bean Validation")
    void requestOtp_emptyEmail_returns400() throws Exception {
        mockMvc.perform(post(BASE_URL + "/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", ""))))
                .andExpect(status().isBadRequest());
    }

    // ── Paso 2: Verificar OTP ─────────────────────────────────────────────

    @Test
    @DisplayName("Paso 2 — POST /verify: OTP correcto → 200 con resetToken")
    void verifyOtp_correctCode_returns200WithResetToken() throws Exception {
        UUID userId = UUID.randomUUID();
        UserInfo userInfo = new UserInfo(userId, EMAIL, "Alumno Test", "STUDENT", null);

        // Token de dominio con el OTP hasheado
        PasswordResetToken fakeToken = new PasswordResetToken(
                UUID.randomUUID(), userId,
                "$2a$hashed-otp",    // otpHash
                null,                 // resetTokenHash
                Instant.now().plusSeconds(600),  // expiresAt
                false, null,          // verified, verifiedAt
                false, null,          // used, usedAt
                0,                    // verifyAttempts
                Instant.now()         // createdAt
        );

        when(userReadPort.findActiveUserInfoByEmail(EMAIL)).thenReturn(Optional.of(userInfo));
        when(passwordResetConfigPort.getMaxVerifyAttempts()).thenReturn(5);
        when(passwordResetTokenPort.findActiveTokenByUserId(any(UUID.class), any(Instant.class)))
                .thenReturn(Optional.of(fakeToken));
        when(passwordHasherPort.matches("123456", "$2a$hashed-otp")).thenReturn(true);
        when(tokenHasherPort.generateRawToken()).thenReturn("raw-reset-token");
        when(tokenHasherPort.hash("raw-reset-token")).thenReturn("hashed-reset-token");
        when(passwordResetTokenPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post(BASE_URL + "/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", EMAIL, "otp", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").value("raw-reset-token"));
    }

    @Test
    @DisplayName("Paso 2 — POST /verify: OTP con formato inválido (menos de 6 dígitos) → 400")
    void verifyOtp_invalidOtpFormat_returns400() throws Exception {
        mockMvc.perform(post(BASE_URL + "/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", EMAIL, "otp", "12"))))
                .andExpect(status().isBadRequest());
    }

    // ── Paso 3: Resetear contraseña ───────────────────────────────────────

    @Test
    @DisplayName("Paso 3 — POST /reset: token válido y contraseña fuerte → 200")
    void resetPassword_validToken_returns200() throws Exception {
        UUID userId = UUID.randomUUID();

        // Token de dominio ya verificado
        PasswordResetToken fakeToken = new PasswordResetToken(
                UUID.randomUUID(), userId,
                null,                          // otpHash
                "hashed-reset-token",          // resetTokenHash
                Instant.now().plusSeconds(600), // expiresAt
                true, Instant.now(),           // verified, verifiedAt
                false, null,                   // used, usedAt
                0,                             // verifyAttempts
                Instant.now()                  // createdAt
        );

        when(tokenHasherPort.hash("raw-reset-token")).thenReturn("hashed-reset-token");
        when(passwordResetTokenPort.findByResetTokenHash(eq("hashed-reset-token"), any(Instant.class)))
                .thenReturn(Optional.of(fakeToken));
        when(passwordHasherPort.encode("NewSecurePass1!")).thenReturn("$2a$new-hash");
        when(passwordResetTokenPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post(BASE_URL + "/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("resetToken", "raw-reset-token",
                                        "newPassword", "NewSecurePass1!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Contraseña actualizada correctamente."));
    }

    @Test
    @DisplayName("Paso 3 — POST /reset: token vacío → 400 por Bean Validation")
    void resetPassword_emptyToken_returns400() throws Exception {
        mockMvc.perform(post(BASE_URL + "/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("resetToken", "", "newPassword", "NewSecurePass1!"))))
                .andExpect(status().isBadRequest());
    }
}
