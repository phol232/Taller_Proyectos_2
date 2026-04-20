package online.horarios_api.token.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.token.domain.model.RefreshToken;
import online.horarios_api.token.domain.port.out.RefreshTokenPort;
import online.horarios_api.token.infrastructure.out.persistence.entity.RefreshTokenEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RefreshTokenRepositoryAdapter implements RefreshTokenPort {

    private final RefreshTokenJpaRepository jpaRepository;

    @Override
    public RefreshToken save(RefreshToken token) {
        RefreshTokenEntity entity = RefreshTokenEntity.fromDomain(token);
        return jpaRepository.save(entity).toDomain();
    }

    @Override
    public Optional<RefreshToken> findById(UUID id) {
        return jpaRepository.findById(id).map(RefreshTokenEntity::toDomain);
    }

    @Override
    public Optional<RefreshToken> findActiveByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHashAndRevokedFalse(tokenHash)
                .map(RefreshTokenEntity::toDomain);
    }

    @Override
    public List<RefreshToken> findActiveSessionsByUserId(UUID userId, Instant now) {
        return jpaRepository.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(userId, now)
                .stream().map(RefreshTokenEntity::toDomain).toList();
    }

    @Override
    public void revokeByTokenHash(String tokenHash, Instant now) {
        jpaRepository.revokeByTokenHash(tokenHash, now);
    }

    @Override
    public void revokeAllByUserId(UUID userId, Instant now) {
        jpaRepository.revokeAllByUserId(userId, now);
    }

    @Override
    public void deleteExpiredOrRevokedByUserId(UUID userId, Instant now) {
        jpaRepository.deleteExpiredOrRevokedByUserId(userId, now);
    }

    @Override
    public void deleteAllExpiredOrRevoked(Instant now) {
        jpaRepository.deleteAllExpiredOrRevoked(now);
    }
}
