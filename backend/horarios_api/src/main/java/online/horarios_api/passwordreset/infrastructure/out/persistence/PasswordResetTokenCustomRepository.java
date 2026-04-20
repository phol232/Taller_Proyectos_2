package online.horarios_api.passwordreset.infrastructure.out.persistence;

import java.time.Instant;
import java.util.UUID;

public interface PasswordResetTokenCustomRepository {

    void invalidatePreviousTokens(UUID userId, Instant now);
}
