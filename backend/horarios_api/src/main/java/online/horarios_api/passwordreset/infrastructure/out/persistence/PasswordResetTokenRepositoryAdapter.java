package online.horarios_api.passwordreset.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.passwordreset.domain.model.PasswordResetToken;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetTokenPort;
import online.horarios_api.passwordreset.infrastructure.out.persistence.entity.PasswordResetTokenEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PasswordResetTokenRepositoryAdapter implements PasswordResetTokenPort {

    private final PasswordResetTokenJpaRepository jpaRepository;

    @Override
    public PasswordResetToken save(PasswordResetToken token) {
        PasswordResetTokenEntity entity = PasswordResetTokenEntity.fromDomain(token);
        return jpaRepository.save(entity).toDomain();
    }

    @Override
    public Optional<PasswordResetToken> findActiveTokenByUserId(UUID userId, Instant now) {
        return jpaRepository.findTop1ByUserIdAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(userId, now)
                .map(PasswordResetTokenEntity::toDomain);
    }

    @Override
    public Optional<PasswordResetToken> findByResetTokenHash(String resetTokenHash, Instant now) {
        return jpaRepository.findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(resetTokenHash, now)
                .map(PasswordResetTokenEntity::toDomain);
    }

    @Override
    public long countRecentByUserId(UUID userId, Instant since) {
        return jpaRepository.countByUserIdAndCreatedAtAfter(userId, since);
    }

    @Override
    public void invalidatePreviousTokens(UUID userId, Instant now) {
        jpaRepository.invalidatePreviousTokens(userId, now);
    }
}
