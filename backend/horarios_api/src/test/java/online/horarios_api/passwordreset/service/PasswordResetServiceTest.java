package online.horarios_api.passwordreset.service;

import online.horarios_api.passwordreset.domain.model.OtpVerificationResult;
import online.horarios_api.passwordreset.application.usecase.PasswordResetService;
import online.horarios_api.passwordreset.domain.model.PasswordResetToken;
import online.horarios_api.passwordreset.domain.port.out.PasswordHasherPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetConfigPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetTokenPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.TooManyRequestsException;
import online.horarios_api.passwordreset.domain.port.out.NotificationPort;
import online.horarios_api.passwordreset.domain.port.out.OtpGeneratorPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordChangePort;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PasswordResetService — lógica de negocio")
class PasswordResetServiceTest {

    @Mock private UserReadPort userReadPort;
    @Mock private PasswordResetTokenPort tokenPort;
    @Mock private NotificationPort notificationPort;
    @Mock private PasswordHasherPort passwordHasherPort;
    @Mock private PasswordResetConfigPort configPort;
    @Mock private TokenHasherPort tokenHasherPort;
    @Mock private OtpGeneratorPort otpGeneratorPort;
    @Mock private PasswordChangePort passwordChangePort;

    @InjectMocks
    private PasswordResetService service;

    private UserInfo userInfo;

    // Real encoder for hash generation in tests
    private final BCryptPasswordEncoder realEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        lenient().when(configPort.getOtpExpiryMinutes()).thenReturn(10);
        lenient().when(configPort.getMaxRequestsPerWindow()).thenReturn(3);
        lenient().when(configPort.getRateLimitWindowMinutes()).thenReturn(15);
        lenient().when(configPort.getMaxVerifyAttempts()).thenReturn(5);

        // Default: delegate encode/matches to real BCrypt
        lenient().when(passwordHasherPort.encode(any())).thenAnswer(inv -> realEncoder.encode(inv.getArgument(0)));
        lenient().when(passwordHasherPort.matches(any(), any())).thenAnswer(inv -> realEncoder.matches(inv.getArgument(0), inv.getArgument(1)));
        lenient().when(tokenHasherPort.hash(any())).thenAnswer(inv -> sha256Hex(inv.getArgument(0)));
        lenient().when(tokenHasherPort.generateRawToken()).thenReturn("secure-random-token-value");
        lenient().when(otpGeneratorPort.generateOtp()).thenReturn("123456");

        userInfo = new UserInfo(UUID.randomUUID(), "user@continental.edu.pe", "Usuario Test", "STUDENT", null);
    }


    @Test
    @DisplayName("requestOtp: correo existente → genera token y envía email")
    void requestOtp_existingUser_savesTokenAndSendsEmail() {
        when(userReadPort.findActiveUserInfoByEmail("user@continental.edu.pe"))
                .thenReturn(Optional.of(userInfo));
        when(tokenPort.countRecentByUserId(eq(userInfo.id()), any(Instant.class)))
                .thenReturn(0L);

        String result = service.requestOtp("user@continental.edu.pe");

        assertThat(result).contains("recibirás");
        verify(tokenPort).invalidatePreviousTokens(eq(userInfo.id()), any(Instant.class));
        verify(tokenPort).save(any(PasswordResetToken.class));
        verify(notificationPort).sendPasswordResetOtp(eq(userInfo.email()), eq(userInfo.fullName()), any(String.class));
    }

    @Test
    @DisplayName("requestOtp: correo inexistente → respuesta genérica sin revelar info")
    void requestOtp_unknownEmail_returnsGenericMessage() {
        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.empty());

        String result = service.requestOtp("unknown@continental.edu.pe");

        assertThat(result).contains("recibirás");
        verifyNoInteractions(tokenPort);
        verifyNoInteractions(notificationPort);
    }

    @Test
    @DisplayName("requestOtp: rate limit alcanzado → respuesta genérica sin enviar email")
    void requestOtp_rateLimitReached_doesNotSendEmail() {
        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
                when(tokenPort.countRecentByUserId(eq(userInfo.id()), any(Instant.class)))
                .thenReturn(3L); // maxRequestsPerWindow = 3

        service.requestOtp("user@continental.edu.pe");

        verify(tokenPort, never()).save(any());
        verify(notificationPort, never()).sendPasswordResetOtp(any(), any(), any());
    }

    @Test
    @DisplayName("requestOtp: OTP generado es de 6 dígitos numéricos")
    void requestOtp_generatedOtp_isSixDigits() {
        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
                when(tokenPort.countRecentByUserId(any(), any())).thenReturn(0L);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        service.requestOtp("user@continental.edu.pe");

        verify(notificationPort).sendPasswordResetOtp(any(), any(), otpCaptor.capture());
        String otp = otpCaptor.getValue();
        assertThat(otp).matches("^[0-9]{6}$");
    }


    @Test
    @DisplayName("verifyOtp: OTP correcto → devuelve resetToken")
    void verifyOtp_correctOtp_returnsResetToken() {
        String rawOtp = "123456";
        PasswordResetToken token = new PasswordResetToken(
                null, userInfo.id(), realEncoder.encode(rawOtp), null,
                Instant.now().plusSeconds(600), false, null, false, null, 0, null);

        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
        when(tokenPort.findActiveTokenByUserId(eq(userInfo.id()), any()))
                .thenReturn(Optional.of(token));

        OtpVerificationResult response = service.verifyOtp("user@continental.edu.pe", rawOtp);

        assertThat(response.resetToken()).isNotBlank();
        assertThat(token.isVerified()).isTrue();
        assertThat(token.getResetTokenHash()).isNotNull();
    }

    @Test
    @DisplayName("verifyOtp: OTP incorrecto → lanza BadRequestException")
    void verifyOtp_wrongOtp_throws400() {
        PasswordResetToken token = new PasswordResetToken(
                null, userInfo.id(), realEncoder.encode("999999"), null,
                Instant.now().plusSeconds(600), false, null, false, null, 0, null);

        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
        when(tokenPort.findActiveTokenByUserId(eq(userInfo.id()), any()))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "111111"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("verifyOtp: sin token activo → lanza BadRequestException")
    void verifyOtp_noActiveToken_throws400() {
        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
                when(tokenPort.findActiveTokenByUserId(any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "123456"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("verifyOtp: máximo de intentos superado → lanza TooManyRequestsException y marca token como usado")
    void verifyOtp_maxAttemptsExceeded_throws429AndInvalidatesToken() {
        PasswordResetToken token = new PasswordResetToken(
                null, userInfo.id(), realEncoder.encode("999999"), null,
                Instant.now().plusSeconds(600), false, null, false, null, 5, null); // maxVerifyAttempts = 5, +1 → 6 > 5

        when(userReadPort.findActiveUserInfoByEmail(any())).thenReturn(Optional.of(userInfo));
        when(tokenPort.findActiveTokenByUserId(eq(userInfo.id()), any()))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "123456"))
                .isInstanceOf(TooManyRequestsException.class);

        assertThat(token.isUsed()).isTrue();
    }


    @Test
    @DisplayName("resetPassword: token válido → actualiza contraseña y marca token como usado")
    void resetPassword_validToken_updatesPasswordAndMarksUsed() {
        String rawResetToken = UUID.randomUUID().toString();
        String tokenHash = sha256Hex(rawResetToken);

        PasswordResetToken token = new PasswordResetToken(
                null, userInfo.id(), "irrelevant", tokenHash,
                Instant.now().plusSeconds(600), true, null, false, null, 0, null);

        when(tokenPort.findByResetTokenHash(eq(tokenHash), any()))
                .thenReturn(Optional.of(token));

        service.resetPassword(rawResetToken, "NewSecurePass1!");

        ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordChangePort).changePassword(eq(userInfo.id()), hashCaptor.capture());
        assertThat(realEncoder.matches("NewSecurePass1!", hashCaptor.getValue())).isTrue();
        assertThat(token.isUsed()).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
    }

    @Test
    @DisplayName("resetPassword: token inválido o expirado → lanza BadRequestException")
    void resetPassword_invalidToken_throws400() {
        when(tokenPort.findByResetTokenHash(any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword("bad-token", "NewPass1!"))
                .isInstanceOf(BadRequestException.class);
    }


    private String sha256Hex(String input) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
