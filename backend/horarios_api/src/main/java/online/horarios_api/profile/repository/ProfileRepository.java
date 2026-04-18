package online.horarios_api.profile.repository;

import online.horarios_api.profile.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByUserId(UUID userId);

    boolean existsByDniAndUserIdNot(String dni, UUID userId);

    boolean existsByPhoneAndUserIdNot(String phone, UUID userId);
}
