package online.horarios_api.profile.domain.port.in;

import online.horarios_api.profile.domain.model.ProfileData;
import online.horarios_api.profile.domain.model.ProfileInfo;

import java.util.UUID;

public interface UpsertProfileUseCase {

    ProfileInfo upsertProfile(UUID userId, ProfileData command);
}
