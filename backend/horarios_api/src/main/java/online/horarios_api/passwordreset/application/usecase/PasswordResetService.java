package online.horarios_api.passwordreset.application.usecase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.passwordreset.domain.model.OtpVerificationResult;
import online.horarios_api.passwordreset.domain.model.PasswordResetToken;
import online.horarios_api.passwordreset.domain.port.in.RequestOtpUseCase;
import online.horarios_api.passwordreset.domain.port.in.ResetPasswordUseCase;
import online.horarios_api.passwordreset.domain.port.in.VerifyOtpUseCase;
import online.horarios_api.passwordreset.domain.port.out.NotificationPort;
import online.horarios_api.passwordreset.domain.port.out.OtpGeneratorPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordHasherPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordChangePort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetConfigPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetTokenPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.TooManyRequestsException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.shared.domain.port.out.UserReadPort;

import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@RequiredArgsConstructor
public class PasswordResetService
        implements RequestOtpUseCase, VerifyOtpUseCase, ResetPasswordUseCase {

    private static final String GENERIC_MESSAGE =
            "Si el correo existe en nuestro sistema, recibirás un código de verificación.";

    private final UserReadPort            userReadPort;
    private final PasswordResetTokenPort  tokenPort;
    private final PasswordHasherPort      passwordHasherPort;
    private final PasswordResetConfigPort configPort;
    private final NotificationPort        notificationPort;
    private final TokenHasherPort         tokenHasherPort;
    private final OtpGeneratorPort        otpGeneratorPort;
    private final PasswordChangePort      passwordChangePort;

    @Override
    @Transactional
    public String requestOtp(String email) {
        userReadPort.findActiveUserInfoByEmail(email).ifPresent(user -> {
            Instant now = Instant.now();
            Instant windowStart = now.minus(configPort.getRateLimitWindowMinutes(), ChronoUnit.MINUTES);

            long recentRequests = tokenPort.countRecentByUserId(user.id(), windowStart);
            if (recentRequests >= configPort.getMaxRequestsPerWindow()) {
                log.warn("Rate limit alcanzado para usuario {}", user.id());
                return;
            }

            tokenPort.invalidatePreviousTokens(user.id(), now);

            String otp = otpGeneratorPort.generateOtp();

            PasswordResetToken token = PasswordResetToken.issueForUser(
                user.id(),
                passwordHasherPort.encode(otp),
                now.plus(configPort.getOtpExpiryMinutes(), ChronoUnit.MINUTES)
            );

            tokenPort.save(token);
            notificationPort.sendPasswordResetOtp(user.email(), user.fullName(), otp);
        });

        return GENERIC_MESSAGE;
    }

    @Override
    @Transactional
    public OtpVerificationResult verifyOtp(String email, String otp) {
        UserInfo user = userReadPort.findActiveUserInfoByEmail(email)
                .orElseThrow(() -> new BadRequestException("Código inválido o expirado"));

        Instant now = Instant.now();
        PasswordResetToken token = tokenPort.findActiveTokenByUserId(user.id(), now)
                .orElseThrow(() -> new BadRequestException("Código inválido o expirado"));

        token.incrementVerifyAttempts();

        if (token.hasExceededAttempts(configPort.getMaxVerifyAttempts())) {
            token.markUsed(now);
            tokenPort.save(token);
            throw new TooManyRequestsException("Demasiados intentos. Solicita un nuevo código.");
        }

        if (!passwordHasherPort.matches(otp, token.getOtpHash())) {
            tokenPort.save(token);
            throw new BadRequestException("Código inválido o expirado");
        }

        String rawResetToken = tokenHasherPort.generateRawToken();
        token.markVerified(tokenHasherPort.hash(rawResetToken), now);
        tokenPort.save(token);

        return new OtpVerificationResult(rawResetToken);
    }

    @Override
    @Transactional
    public void resetPassword(String rawResetToken, String newPassword) {
        Instant now = Instant.now();
        String tokenHash = tokenHasherPort.hash(rawResetToken);

        PasswordResetToken token = tokenPort.findByResetTokenHash(tokenHash, now)
                .orElseThrow(() -> new BadRequestException(
                        "El enlace de recuperación es inválido o ya expiró"));

        passwordChangePort.changePassword(token.getUserId(), passwordHasherPort.encode(newPassword));

        token.markUsed(now);
        tokenPort.save(token);

        log.info("Contraseña restablecida para usuario {}", token.getUserId());
    }

}
