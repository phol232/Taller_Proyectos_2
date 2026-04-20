package online.horarios_api.user.domain.port.out;

import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import online.horarios_api.user.domain.model.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPort {

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndActiveTrue(String email);

    User save(User user);

    Optional<OAuth2LinkedAccount> findOAuth2Account(String provider, String providerSubject);

    OAuth2LinkedAccount saveOAuth2Account(OAuth2LinkedAccount account);

    List<User> findAll();

    List<User> findByFullNameContaining(String query);
}
