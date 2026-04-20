package online.horarios_api.token.infrastructure.out.persistence;

import java.time.Instant;
import java.util.UUID;

public interface RefreshTokenCustomRepository {

    void revokeByTokenHash(String tokenHash, Instant now);

    void revokeAllByUserId(UUID userId, Instant now);

    void deleteExpiredOrRevokedByUserId(UUID userId, Instant now);

    void deleteAllExpiredOrRevoked(Instant now);
}
