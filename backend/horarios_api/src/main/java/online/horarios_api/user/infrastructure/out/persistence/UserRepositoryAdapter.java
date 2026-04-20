package online.horarios_api.user.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import online.horarios_api.user.infrastructure.out.persistence.entity.OAuth2LinkedAccountEntity;
import online.horarios_api.user.infrastructure.out.persistence.entity.UserEntity;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserPort {

    private final UserJpaRepository                userJpaRepository;
    private final OAuth2LinkedAccountJpaRepository oauth2JpaRepository;

    @Override
    public Optional<User> findById(UUID id) {
        return userJpaRepository.findById(id).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userJpaRepository.findByEmail(email).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmailAndActiveTrue(String email) {
        return userJpaRepository.findByEmailAndActiveTrue(email).map(UserEntity::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = UserEntity.fromDomain(user);
        return userJpaRepository.save(entity).toDomain();
    }

    @Override
    public Optional<OAuth2LinkedAccount> findOAuth2Account(String provider, String providerSubject) {
        return oauth2JpaRepository.findByProviderAndProviderSubject(provider, providerSubject)
                .map(OAuth2LinkedAccountEntity::toDomain);
    }

    @Override
    public OAuth2LinkedAccount saveOAuth2Account(OAuth2LinkedAccount account) {
        OAuth2LinkedAccountEntity entity = OAuth2LinkedAccountEntity.fromDomain(account);
        return oauth2JpaRepository.save(entity).toDomain();
    }
}
