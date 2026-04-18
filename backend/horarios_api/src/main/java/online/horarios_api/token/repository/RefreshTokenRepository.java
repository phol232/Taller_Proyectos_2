package online.horarios_api.token.repository;

import online.horarios_api.token.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, UUID>, RefreshTokenCustomRepository {

    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            UUID userId, Instant now);
}

