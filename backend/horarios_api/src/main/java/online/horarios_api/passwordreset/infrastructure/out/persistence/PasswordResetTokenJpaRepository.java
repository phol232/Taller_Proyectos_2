package online.horarios_api.passwordreset.infrastructure.out.persistence;

import online.horarios_api.passwordreset.infrastructure.out.persistence.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenJpaRepository
        extends JpaRepository<PasswordResetTokenEntity, UUID>, PasswordResetTokenCustomRepository {

    Optional<PasswordResetTokenEntity> findTop1ByUserIdAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            UUID userId, Instant now);

    Optional<PasswordResetTokenEntity> findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(
            String resetTokenHash, Instant now);

        long countByUserIdAndCreatedAtAfter(UUID userId, Instant since);
}
