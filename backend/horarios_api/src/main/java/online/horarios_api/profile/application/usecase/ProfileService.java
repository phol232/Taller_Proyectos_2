package online.horarios_api.profile.application.usecase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import online.horarios_api.profile.domain.model.ProfileData;
import online.horarios_api.profile.domain.model.ProfileInfo;
import online.horarios_api.profile.domain.exception.DuplicateProfileFieldException;
import online.horarios_api.profile.domain.model.Profile;
import online.horarios_api.profile.domain.port.in.GetProfileUseCase;
import online.horarios_api.profile.domain.port.in.UpsertProfileUseCase;
import online.horarios_api.profile.domain.port.out.ProfilePort;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;

import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
public class ProfileService implements GetProfileUseCase, UpsertProfileUseCase {

    private final ProfilePort   profilePort;
    private final UserReadPort   userReadPort;

    @Override
    @Transactional(readOnly = true)
    public ProfileInfo getProfile(UUID userId) {
        log.debug("Consultando perfil: userId={}", userId);
        UserInfo user = resolveUser(userId);

        return profilePort.findByUserId(userId)
                .map(profile -> toResponse(profile, user))
                .orElseGet(() -> emptyResponse(user));
    }

    @Override
    @Transactional
    public ProfileInfo upsertProfile(UUID userId, ProfileData command) {
        log.info("Upsert perfil iniciado: userId={}", userId);
        UserInfo user = resolveUser(userId);

        validateUniqueDni(command.dni(), userId);
        validateUniquePhone(command.phone(), userId);

        Profile profile = profilePort.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creando nuevo perfil: userId={}", userId);
                    return Profile.createForUser(userId);
                });

        profile.updateData(command);

        Profile saved = profilePort.save(profile);
        log.info("Perfil guardado: userId={} profileId={}", userId, saved.getId());
        return toResponse(saved, user);
    }

    private UserInfo resolveUser(UUID userId) {
        return userReadPort.findUserInfoById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario no encontrado al acceder al perfil: userId={}", userId);
                    return new NotFoundException("Usuario no encontrado.");
                });
    }

    private void validateUniqueDni(String dni, UUID userId) {
        if (dni == null || dni.isBlank()) return;
        if (profilePort.existsByDniAndUserIdNot(dni, userId)) {
            log.warn("Conflicto DNI: dni={} userId={}", dni, userId);
            throw new DuplicateProfileFieldException("dni",
                    "El DNI '" + dni + "' ya está registrado por otro usuario.");
        }
    }

    private void validateUniquePhone(String phone, UUID userId) {
        if (phone == null || phone.isBlank()) return;
        if (profilePort.existsByPhoneAndUserIdNot(phone, userId)) {
            log.warn("Conflicto teléfono: phone={} userId={}", phone, userId);
            throw new DuplicateProfileFieldException("phone",
                    "El teléfono '" + phone + "' ya está registrado por otro usuario.");
        }
    }

    private ProfileInfo toResponse(Profile profile, UserInfo user) {
        return new ProfileInfo(
                profile.getId(),
                profile.getUserId(),
                user.fullName(),
                user.email(),
                user.role(),
                profile.getDni(),
                profile.getPhone(),
                profile.getSex(),
                profile.getAge() != null ? profile.getAge().intValue() : null,
                profile.getFacultadId(),
                profile.getCarreraId(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    private ProfileInfo emptyResponse(UserInfo user) {
        return new ProfileInfo(
                null,
                user.id(),
                user.fullName(),
                user.email(),
                user.role(),
                null, null, null, null, null, null, null, null
        );
    }

}
