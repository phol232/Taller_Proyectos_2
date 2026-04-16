package online.horarios_api.token.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Repository
@Transactional
public class RefreshTokenCustomRepositoryImpl implements RefreshTokenCustomRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public void revokeByTokenHash(String tokenHash, Instant now) {
        em.createNativeQuery("SELECT fn_revoke_refresh_token(?1, ?2)")
                .setParameter(1, tokenHash)
                .setParameter(2, Timestamp.from(now))
                .getSingleResult();
    }

    @Override
    public void revokeAllByUserId(UUID userId, Instant now) {
        em.createNativeQuery("SELECT fn_revoke_all_user_tokens(?1, ?2)")
                .setParameter(1, userId)
                .setParameter(2, Timestamp.from(now))
                .getSingleResult();
    }

    @Override
    public void deleteExpiredOrRevokedByUserId(UUID userId, Instant now) {
        em.createNativeQuery("SELECT fn_delete_user_expired_tokens(?1, ?2)")
                .setParameter(1, userId)
                .setParameter(2, Timestamp.from(now))
                .getSingleResult();
    }

    @Override
    public void deleteAllExpiredOrRevoked(Instant now) {
        em.createNativeQuery("SELECT fn_delete_all_expired_tokens(?1)")
                .setParameter(1, Timestamp.from(now))
                .getSingleResult();
    }
}
