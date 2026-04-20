package online.horarios_api.user.infrastructure.out.persistence;

import online.horarios_api.user.infrastructure.out.persistence.entity.OAuth2LinkedAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OAuth2LinkedAccountJpaRepository extends JpaRepository<OAuth2LinkedAccountEntity, UUID> {

    Optional<OAuth2LinkedAccountEntity> findByProviderAndProviderSubject(String provider, String providerSubject);
}
