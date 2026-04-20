package online.horarios_api.auth.domain.port.in;

import online.horarios_api.shared.domain.model.UserInfo;

import java.util.UUID;

public interface GetCurrentUserUseCase {

    UserInfo getCurrentUser(UUID userId);
}
