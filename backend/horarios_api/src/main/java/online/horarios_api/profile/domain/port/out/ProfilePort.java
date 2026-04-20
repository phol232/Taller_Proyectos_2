package online.horarios_api.profile.domain.port.out;

import online.horarios_api.profile.domain.model.Profile;

import java.util.Optional;
import java.util.UUID;

public interface ProfilePort {

    Optional<Profile> findByUserId(UUID userId);

    boolean existsByDniAndUserIdNot(String dni, UUID userId);

    boolean existsByPhoneAndUserIdNot(String phone, UUID userId);

    Profile save(Profile profile);
}
