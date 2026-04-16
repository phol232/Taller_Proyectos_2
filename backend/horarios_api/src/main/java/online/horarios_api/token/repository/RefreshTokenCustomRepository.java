package online.horarios_api.token.repository;

import java.time.Instant;
import java.util.UUID;

public interface RefreshTokenCustomRepository {

    void revokeByTokenHash(String tokenHash, Instant now);

    void revokeAllByUserId(UUID userId, Instant now);

    void deleteExpiredOrRevokedByUserId(UUID userId, Instant now);

    void deleteAllExpiredOrRevoked(Instant now);
}
