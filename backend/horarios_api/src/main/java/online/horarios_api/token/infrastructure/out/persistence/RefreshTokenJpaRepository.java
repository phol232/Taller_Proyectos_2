package online.horarios_api.token.infrastructure.out.persistence;

import online.horarios_api.token.infrastructure.out.persistence.entity.RefreshTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenJpaRepository
        extends JpaRepository<RefreshTokenEntity, UUID>, RefreshTokenCustomRepository {

    Optional<RefreshTokenEntity> findByTokenHashAndRevokedFalse(String tokenHash);

    List<RefreshTokenEntity> findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            UUID userId, Instant now);
}
