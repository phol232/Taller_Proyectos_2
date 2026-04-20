package online.horarios_api.token.domain.port.out;

import online.horarios_api.token.domain.model.RefreshToken;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenPort {

    RefreshToken save(RefreshToken token);

    Optional<RefreshToken> findById(UUID id);

    Optional<RefreshToken> findActiveByTokenHash(String tokenHash);

    List<RefreshToken> findActiveSessionsByUserId(UUID userId, Instant now);

    void revokeByTokenHash(String tokenHash, Instant now);

    void revokeAllByUserId(UUID userId, Instant now);

    void deleteExpiredOrRevokedByUserId(UUID userId, Instant now);

    void deleteAllExpiredOrRevoked(Instant now);
}
