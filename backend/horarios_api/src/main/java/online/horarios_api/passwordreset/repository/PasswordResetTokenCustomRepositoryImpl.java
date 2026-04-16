package online.horarios_api.passwordreset.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Repository
@Transactional
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
