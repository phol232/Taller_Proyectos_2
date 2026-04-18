package online.horarios_api.profile.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.profile.dto.ProfileRequest;
import online.horarios_api.profile.dto.ProfileResponse;
import online.horarios_api.profile.entity.Profile;
import online.horarios_api.profile.exception.DuplicateProfileFieldException;
import online.horarios_api.profile.repository.ProfileRepository;
import online.horarios_api.user.entity.User;
import online.horarios_api.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository    userRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        log.debug("Consultando perfil: userId={}", userId);

        User user = resolveUser(userId);

        return profileRepository.findByUserId(userId)
                .map(profile -> toResponse(profile, user))
                .orElseGet(() -> emptyResponse(user));
    }


    @Transactional
    public ProfileResponse upsertProfile(UUID userId, ProfileRequest request) {
        log.info("Upsert perfil iniciado: userId={}", userId);

        User user = resolveUser(userId);

        validateUniqueDni(request.dni(), userId);
        validateUniquePhone(request.phone(), userId);

        Profile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creando nuevo perfil: userId={}", userId);
                    return Profile.builder().user(user).build();
                });

        profile.setDni(normalizeBlank(request.dni()));
        profile.setPhone(normalizeBlank(request.phone()));
        profile.setSex(request.sex());
        profile.setAge(request.age() != null ? request.age().shortValue() : null);

        Profile saved = profileRepository.save(profile);

        log.info("Perfil guardado: userId={} profileId={}", userId, saved.getId());
        return toResponse(saved, user);
    }

    private User resolveUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario no encontrado al acceder al perfil: userId={}", userId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Usuario no encontrado.");
                });
    }

    private void validateUniqueDni(String dni, UUID userId) {
        if (dni == null || dni.isBlank()) return;
        if (profileRepository.existsByDniAndUserIdNot(dni, userId)) {
            log.warn("Conflicto DNI: dni={} userId={}", dni, userId);
            throw new DuplicateProfileFieldException("dni",
                    "El DNI '" + dni + "' ya está registrado por otro usuario.");
        }
    }

    private void validateUniquePhone(String phone, UUID userId) {
        if (phone == null || phone.isBlank()) return;
        if (profileRepository.existsByPhoneAndUserIdNot(phone, userId)) {
            log.warn("Conflicto teléfono: phone={} userId={}", phone, userId);
            throw new DuplicateProfileFieldException("phone",
                    "El teléfono '" + phone + "' ya está registrado por otro usuario.");
        }
    }

    private String normalizeBlank(String value) {
        return (value == null || value.isBlank()) ? null : value.strip();
    }

    private ProfileResponse toResponse(Profile profile, User user) {
        return new ProfileResponse(
                profile.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                profile.getDni(),
                profile.getPhone(),
                profile.getSex(),
                profile.getAge() != null ? profile.getAge().intValue() : null,
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    private ProfileResponse emptyResponse(User user) {
        return new ProfileResponse(
                null,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                null, null, null, null, null, null
        );
    }
}
