package online.horarios_api.passwordreset.repository;

import online.horarios_api.passwordreset.entity.PasswordResetToken;
import online.horarios_api.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, UUID>, PasswordResetTokenCustomRepository {

    /**
     * Último token activo (no usado, no expirado) de un usuario, ordenado por creación DESC.
     */
    Optional<PasswordResetToken> findTop1ByUserAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            User user, Instant now);

    /**
     * Token de reset por su hash SHA-256 (verificado, no usado, no expirado).
     */
    Optional<PasswordResetToken> findByResetTokenHashAndVerifiedTrueAndUsedFalseAndExpiresAtAfter(
            String resetTokenHash, Instant now);

    /**
     * Cuenta cuántos tokens se crearon para el usuario desde un instante dado (rate limiting).
     */
    long countByUserAndCreatedAtAfter(User user, Instant since);
}
