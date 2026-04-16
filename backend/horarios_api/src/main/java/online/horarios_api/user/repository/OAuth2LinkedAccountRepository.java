package online.horarios_api.user.repository;

import online.horarios_api.user.entity.OAuth2LinkedAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OAuth2LinkedAccountRepository extends JpaRepository<OAuth2LinkedAccount, UUID> {

    Optional<OAuth2LinkedAccount> findByProviderAndProviderSubject(String provider, String providerSubject);
}
