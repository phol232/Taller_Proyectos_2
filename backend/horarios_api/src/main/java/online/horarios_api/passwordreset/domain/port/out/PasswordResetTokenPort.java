package online.horarios_api.passwordreset.domain.port.out;

import online.horarios_api.passwordreset.domain.model.PasswordResetToken;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenPort {

    PasswordResetToken save(PasswordResetToken token);

    Optional<PasswordResetToken> findActiveTokenByUserId(UUID userId, Instant now);

    Optional<PasswordResetToken> findByResetTokenHash(String resetTokenHash, Instant now);

    long countRecentByUserId(UUID userId, Instant since);

    void invalidatePreviousTokens(UUID userId, Instant now);
}
