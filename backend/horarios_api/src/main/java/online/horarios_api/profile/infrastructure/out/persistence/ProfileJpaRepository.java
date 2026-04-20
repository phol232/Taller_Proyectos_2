package online.horarios_api.profile.infrastructure.out.persistence;

import online.horarios_api.profile.infrastructure.out.persistence.entity.ProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileJpaRepository extends JpaRepository<ProfileEntity, UUID> {

    Optional<ProfileEntity> findByUserId(UUID userId);

    boolean existsByDniAndUserIdNot(String dni, UUID userId);

    boolean existsByPhoneAndUserIdNot(String phone, UUID userId);
}
