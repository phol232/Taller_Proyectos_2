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
import java.util.Optional;

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
        log.debug("[password-reset][request] iniciando flujo email={}", maskEmail(email));

                Optional<UserInfo> userOptional = userReadPort.findActiveUserInfoByEmail(email);

                userOptional.ifPresent(user -> {
            Instant now = Instant.now();
            Instant windowStart = now.minus(configPort.getRateLimitWindowMinutes(), ChronoUnit.MINUTES);

            log.debug("[password-reset][request] usuario encontrado userId={} now={} windowStart={}",
                    user.id(), now, windowStart);

            long recentRequests = tokenPort.countRecentByUserId(user.id(), windowStart);
            log.debug("[password-reset][request] consultas recientes userId={} recentRequests={} maxRequests={} rateWindowMinutes={}",
                    user.id(), recentRequests, configPort.getMaxRequestsPerWindow(), configPort.getRateLimitWindowMinutes());

            if (recentRequests >= configPort.getMaxRequestsPerWindow()) {
                log.warn("Rate limit alcanzado para usuario {}", user.id());
                return;
            }

            tokenPort.invalidatePreviousTokens(user.id(), now);
            log.debug("[password-reset][request] tokens previos invalidados userId={} invalidatedAt={}", user.id(), now);

            String otp = otpGeneratorPort.generateOtp();
            Instant expiresAt = now.plus(configPort.getOtpExpiryMinutes(), ChronoUnit.MINUTES);

            PasswordResetToken token = PasswordResetToken.issueForUser(
                user.id(),
                passwordHasherPort.encode(otp),
                expiresAt
            );

            PasswordResetToken savedToken = tokenPort.save(token);
            Object savedTokenId = savedToken != null ? savedToken.getId() : token.getId();
            log.info("[password-reset][request] OTP emitido userId={} tokenId={} expiresAt={} otpExpiryMinutes={}",
                    user.id(), savedTokenId, expiresAt, configPort.getOtpExpiryMinutes());
            notificationPort.sendPasswordResetOtp(user.email(), user.fullName(), otp);
            log.info("[password-reset][request] notificacion enviada userId={} email={}", user.id(), maskEmail(user.email()));
        });

                if (userOptional.isEmpty()) {
            log.info("[password-reset][request] correo no encontrado o usuario inactivo email={}", maskEmail(email));
        }

        return GENERIC_MESSAGE;
    }

    @Override
    @Transactional
    public OtpVerificationResult verifyOtp(String email, String otp) {
        log.info("[password-reset][verify] inicio email={} otpLength={}",
                maskEmail(email), otp == null ? 0 : otp.length());

        UserInfo user = userReadPort.findActiveUserInfoByEmail(email)
                .orElseThrow(() -> {
                    log.warn("[password-reset][verify] usuario no encontrado o inactivo email={}", maskEmail(email));
                    return new BadRequestException("Código inválido o expirado");
                });

        Instant now = Instant.now();
        log.debug("[password-reset][verify] buscando token activo userId={} now={}", user.id(), now);

        PasswordResetToken token = tokenPort.findActiveTokenByUserId(user.id(), now)
                .orElseThrow(() -> {
                    log.warn("[password-reset][verify] no se encontró token activo userId={} now={}", user.id(), now);
                    return new BadRequestException("Código inválido o expirado");
                });

        log.info("[password-reset][verify] token encontrado userId={} tokenId={} expiresAt={} verified={} used={} verifyAttempts={}",
                user.id(), token.getId(), token.getExpiresAt(), token.isVerified(), token.isUsed(), token.getVerifyAttempts());

        token.incrementVerifyAttempts();
        log.debug("[password-reset][verify] intento incrementado userId={} tokenId={} verifyAttempts={} maxVerifyAttempts={}",
                user.id(), token.getId(), token.getVerifyAttempts(), configPort.getMaxVerifyAttempts());

        if (token.hasExceededAttempts(configPort.getMaxVerifyAttempts())) {
            token.markUsed(now);
            tokenPort.save(token);
            log.warn("[password-reset][verify] máximo de intentos excedido userId={} tokenId={} usedAt={}",
                    user.id(), token.getId(), now);
            throw new TooManyRequestsException("Demasiados intentos. Solicita un nuevo código.");
        }

        if (!passwordHasherPort.matches(otp, token.getOtpHash())) {
            tokenPort.save(token);
            log.warn("[password-reset][verify] OTP no coincide userId={} tokenId={} verifyAttempts={} expiresAt={}",
                    user.id(), token.getId(), token.getVerifyAttempts(), token.getExpiresAt());
            throw new BadRequestException("Código inválido o expirado");
        }

        String rawResetToken = tokenHasherPort.generateRawToken();
        String resetTokenHash = tokenHasherPort.hash(rawResetToken);
        token.markVerified(resetTokenHash, now);
        tokenPort.save(token);

        log.info("[password-reset][verify] OTP validado userId={} tokenId={} verifiedAt={} resetTokenHashPrefix={} expiresAt={}",
                user.id(), token.getId(), now, shortHash(resetTokenHash), token.getExpiresAt());

        return new OtpVerificationResult(rawResetToken);
    }

    @Override
    @Transactional
    public void resetPassword(String rawResetToken, String newPassword) {
        Instant now = Instant.now();
        String tokenHash = tokenHasherPort.hash(rawResetToken);

        log.info("[password-reset][reset] inicio now={} resetTokenHashPrefix={} newPasswordLength={}",
                now, shortHash(tokenHash), newPassword == null ? 0 : newPassword.length());

        PasswordResetToken token = tokenPort.findByResetTokenHash(tokenHash, now)
                .orElseThrow(() -> {
                    log.warn("[password-reset][reset] token no encontrado, no verificado, usado o expirado resetTokenHashPrefix={} now={}",
                            shortHash(tokenHash), now);
                    return new BadRequestException(
                            "El enlace de recuperación es inválido o ya expiró");
                });

        log.info("[password-reset][reset] token válido userId={} tokenId={} verified={} used={} expiresAt={} verifiedAt={}",
                token.getUserId(), token.getId(), token.isVerified(), token.isUsed(), token.getExpiresAt(), token.getVerifiedAt());

        passwordChangePort.changePassword(token.getUserId(), passwordHasherPort.encode(newPassword));
        log.info("[password-reset][reset] password actualizada userId={} tokenId={}", token.getUserId(), token.getId());

        token.markUsed(now);
        tokenPort.save(token);

        log.info("[password-reset][reset] token marcado como usado userId={} tokenId={} usedAt={}",
                token.getUserId(), token.getId(), now);
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

    private String shortHash(String hash) {
        if (hash == null || hash.isBlank()) {
            return "<empty>";
        }

        return hash.length() <= 8 ? hash : hash.substring(0, 8);
    }

}
