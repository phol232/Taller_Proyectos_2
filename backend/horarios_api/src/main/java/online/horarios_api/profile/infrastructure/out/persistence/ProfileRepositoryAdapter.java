package online.horarios_api.profile.infrastructure.out.persistence;

import lombok.RequiredArgsConstructor;
import online.horarios_api.profile.domain.exception.DuplicateProfileFieldException;
import online.horarios_api.profile.domain.model.Profile;
import online.horarios_api.profile.domain.port.out.ProfilePort;
import online.horarios_api.profile.infrastructure.out.persistence.entity.ProfileEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ProfileRepositoryAdapter implements ProfilePort {

    private final ProfileJpaRepository jpaRepository;

    @Override
    public Optional<Profile> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId).map(ProfileEntity::toDomain);
    }

    @Override
    public boolean existsByDniAndUserIdNot(String dni, UUID userId) {
        return jpaRepository.existsByDniAndUserIdNot(dni, userId);
    }

    @Override
    public boolean existsByPhoneAndUserIdNot(String phone, UUID userId) {
        return jpaRepository.existsByPhoneAndUserIdNot(phone, userId);
    }

    @Override
    public Profile save(Profile profile) {
        try {
            ProfileEntity entity = ProfileEntity.fromDomain(profile);
            return jpaRepository.save(entity).toDomain();
        } catch (DataIntegrityViolationException ex) {
            String rawDetail = ex.getMostSpecificCause().getMessage();
            String detail = rawDetail != null ? rawDetail.toLowerCase() : "";
            if (detail.contains("uq_profiles_dni")) {
                throw new DuplicateProfileFieldException("dni",
                        "El DNI ya está registrado por otro usuario.");
            }
            if (detail.contains("uq_profiles_phone")) {
                throw new DuplicateProfileFieldException("phone",
                        "El teléfono ya está registrado por otro usuario.");
            }
            throw new DuplicateProfileFieldException("profile",
                    "Ya existe un perfil con los datos proporcionados.");
        }
    }
}
