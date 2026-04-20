package online.horarios_api.profile.domain.port.in;

import online.horarios_api.profile.domain.model.ProfileInfo;

import java.util.UUID;

public interface GetProfileUseCase {

    ProfileInfo getProfile(UUID userId);
}
