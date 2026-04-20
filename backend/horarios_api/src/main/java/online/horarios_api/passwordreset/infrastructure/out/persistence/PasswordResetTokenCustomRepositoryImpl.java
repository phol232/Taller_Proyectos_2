package online.horarios_api.passwordreset.infrastructure.out.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Repository
public class PasswordResetTokenCustomRepositoryImpl implements PasswordResetTokenCustomRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public void invalidatePreviousTokens(UUID userId, Instant now) {
        em.createNativeQuery("SELECT fn_invalidate_user_prt(?1, ?2)")
                .setParameter(1, userId)
                .setParameter(2, Timestamp.from(now))
                .getSingleResult();
    }
}
