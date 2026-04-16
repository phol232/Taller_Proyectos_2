package online.horarios_api.passwordreset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.passwordreset.dto.VerifyOtpResponse;
import online.horarios_api.passwordreset.entity.PasswordResetToken;
import online.horarios_api.passwordreset.repository.PasswordResetTokenRepository;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final String GENERIC_MESSAGE =
            "Si el correo existe en nuestro sistema, recibirás un código de verificación.";

    private final UserRepository              userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder             passwordEncoder;
    private final EmailService                emailService;

    @Value("${app.password-reset.otp-expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.password-reset.max-requests-per-window:3}")
    private int maxRequestsPerWindow;

    @Value("${app.password-reset.rate-limit-window-minutes:15}")
    private int rateLimitWindowMinutes;

    @Value("${app.password-reset.max-verify-attempts:5}")
    private int maxVerifyAttempts;

    @Transactional
    public String requestOtp(String email) {
        userRepository.findByEmailAndActiveTrue(email).ifPresent(user -> {
            Instant now = Instant.now();
            Instant windowStart = now.minus(rateLimitWindowMinutes, ChronoUnit.MINUTES);

            long recentRequests = tokenRepository.countByUserAndCreatedAtAfter(user, windowStart);
            if (recentRequests >= maxRequestsPerWindow) {
                log.warn("Rate limit alcanzado para usuario {}", user.getId());
                return;
            }

            // Llama a fn_invalidate_user_prt vía CustomRepositoryImpl
            tokenRepository.invalidatePreviousTokens(user.getId(), now);

            String otp = generateSecureOtp();

            PasswordResetToken token = PasswordResetToken.builder()
                    .user(user)
                    .otpHash(passwordEncoder.encode(otp))
                    .expiresAt(now.plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                    .build();

            tokenRepository.save(token);

            emailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp);
        });

        return GENERIC_MESSAGE;
    }

    @Transactional
    public VerifyOtpResponse verifyOtp(String email, String otp) {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Código inválido o expirado"));

        Instant now = Instant.now();
        PasswordResetToken token = tokenRepository.findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(user, now)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Código inválido o expirado"));

        token.setVerifyAttempts(token.getVerifyAttempts() + 1);

        if (token.getVerifyAttempts() > maxVerifyAttempts) {
            token.setUsed(true);
            token.setUsedAt(now);
            tokenRepository.save(token);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos. Solicita un nuevo código.");
        }

        if (!passwordEncoder.matches(otp, token.getOtpHash())) {
            tokenRepository.save(token);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Código inválido o expirado");
        }

        String rawResetToken = UUID.randomUUID().toString();
        token.setResetTokenHash(sha256Hex(rawResetToken));
        token.setVerified(true);
        token.setVerifiedAt(now);
        tokenRepository.save(token);

        return new VerifyOtpResponse(rawResetToken);
    }

    @Transactional
    public void resetPassword(String rawResetToken, String newPassword) {
        Instant now = Instant.now();
        String tokenHash = sha256Hex(rawResetToken);

        PasswordResetToken token = tokenRepository.findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(tokenHash, now)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El enlace de recuperación es inválido o ya expiró"));

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        token.setUsedAt(now);
        tokenRepository.save(token);

        log.info("Contraseña restablecida para usuario {}", user.getId());
    }

    private String generateSecureOtp() {
        SecureRandom random = new SecureRandom();
        int code = random.nextInt(900_000) + 100_000;
        return String.valueOf(code);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
