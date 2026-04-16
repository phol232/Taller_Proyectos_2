package online.horarios_api.passwordreset.repository;

import java.time.Instant;
import java.util.UUID;

public interface PasswordResetTokenCustomRepository {

    /**
     * Invoca fn_invalidate_user_prt: marca como usados todos los tokens
     * activos del usuario antes de emitir un nuevo OTP.
     */
    void invalidatePreviousTokens(UUID userId, Instant now);
}
