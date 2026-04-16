package online.horarios_api.passwordreset.service;

import online.horarios_api.passwordreset.dto.VerifyOtpResponse;
import online.horarios_api.passwordreset.entity.PasswordResetToken;
import online.horarios_api.passwordreset.repository.PasswordResetTokenRepository;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

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

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private EmailService emailService;

    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @InjectMocks
    private PasswordResetService service;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "otpExpiryMinutes", 10);
        ReflectionTestUtils.setField(service, "maxRequestsPerWindow", 3);
        ReflectionTestUtils.setField(service, "rateLimitWindowMinutes", 15);
        ReflectionTestUtils.setField(service, "maxVerifyAttempts", 5);

        user = User.builder()
                .id(UUID.randomUUID())
                .email("user@continental.edu.pe")
                .fullName("Usuario Test")
                .build();
    }


    @Test
    @DisplayName("requestOtp: correo existente → genera token y envía email")
    void requestOtp_existingUser_savesTokenAndSendsEmail() {
        when(userRepository.findByEmailAndActiveTrue("user@continental.edu.pe"))
                .thenReturn(Optional.of(user));
        when(tokenRepository.countByUserAndCreatedAtAfter(eq(user), any(Instant.class)))
                .thenReturn(0L);

        String result = service.requestOtp("user@continental.edu.pe");

        assertThat(result).contains("recibirás");
        verify(tokenRepository).invalidatePreviousTokens(eq(user.getId()), any(Instant.class));
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetOtp(eq(user.getEmail()), eq(user.getFullName()), any(String.class));
    }

    @Test
    @DisplayName("requestOtp: correo inexistente → respuesta genérica sin revelar info")
    void requestOtp_unknownEmail_returnsGenericMessage() {
        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.empty());

        String result = service.requestOtp("unknown@continental.edu.pe");

        assertThat(result).contains("recibirás");
        verifyNoInteractions(tokenRepository);
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("requestOtp: rate limit alcanzado → respuesta genérica sin enviar email")
    void requestOtp_rateLimitReached_doesNotSendEmail() {
        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.countByUserAndCreatedAtAfter(eq(user), any(Instant.class)))
                .thenReturn(3L); // maxRequestsPerWindow = 3

        service.requestOtp("user@continental.edu.pe");

        verify(tokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetOtp(any(), any(), any());
    }

    @Test
    @DisplayName("requestOtp: OTP generado es de 6 dígitos numéricos")
    void requestOtp_generatedOtp_isSixDigits() {
        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.countByUserAndCreatedAtAfter(any(), any())).thenReturn(0L);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        service.requestOtp("user@continental.edu.pe");

        verify(emailService).sendPasswordResetOtp(any(), any(), otpCaptor.capture());
        String otp = otpCaptor.getValue();
        assertThat(otp).matches("^[0-9]{6}$");
    }


    @Test
    @DisplayName("verifyOtp: OTP correcto → devuelve resetToken")
    void verifyOtp_correctOtp_returnsResetToken() {
        String rawOtp = "123456";
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(rawOtp))
                .expiresAt(Instant.now().plusSeconds(600))
                .verifyAttempts(0)
                .build();

        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(user), any()))
                .thenReturn(Optional.of(token));

        VerifyOtpResponse response = service.verifyOtp("user@continental.edu.pe", rawOtp);

        assertThat(response.resetToken()).isNotBlank();
        assertThat(token.isVerified()).isTrue();
        assertThat(token.getResetTokenHash()).isNotNull();
    }

    @Test
    @DisplayName("verifyOtp: OTP incorrecto → lanza 400")
    void verifyOtp_wrongOtp_throws400() {
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode("999999"))
                .expiresAt(Instant.now().plusSeconds(600))
                .verifyAttempts(0)
                .build();

        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(user), any()))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "111111"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("verifyOtp: sin token activo → lanza 400")
    void verifyOtp_noActiveToken_throws400() {
        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "123456"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("verifyOtp: máximo de intentos superado → lanza 429 y marca token como usado")
    void verifyOtp_maxAttemptsExceeded_throws429AndInvalidatesToken() {
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode("999999"))
                .expiresAt(Instant.now().plusSeconds(600))
                .verifyAttempts(5) // maxVerifyAttempts = 5, +1 → 6 > 5
                .build();

        when(userRepository.findByEmailAndActiveTrue(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(user), any()))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.verifyOtp("user@continental.edu.pe", "123456"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

        assertThat(token.isUsed()).isTrue();
    }


    @Test
    @DisplayName("resetPassword: token válido → actualiza contraseña y marca token como usado")
    void resetPassword_validToken_updatesPasswordAndMarksUsed() {
        String rawResetToken = UUID.randomUUID().toString();
        String tokenHash = sha256Hex(rawResetToken);

        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash("irrelevant")
                .expiresAt(Instant.now().plusSeconds(600))
                .verified(true)
                .used(false)
                .resetTokenHash(tokenHash)
                .build();

        when(tokenRepository.findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(eq(tokenHash), any()))
                .thenReturn(Optional.of(token));

        service.resetPassword(rawResetToken, "NewSecurePass1!");

        verify(userRepository).save(user);
        assertThat(passwordEncoder.matches("NewSecurePass1!", user.getPasswordHash())).isTrue();
        assertThat(token.isUsed()).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
    }

    @Test
    @DisplayName("resetPassword: token inválido o expirado → lanza 400")
    void resetPassword_invalidToken_throws400() {
        when(tokenRepository.findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword("bad-token", "NewPass1!"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
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
