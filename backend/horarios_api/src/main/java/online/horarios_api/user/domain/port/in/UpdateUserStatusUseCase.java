package online.horarios_api.user.domain.port.in;

import online.horarios_api.user.domain.model.User;

import java.util.UUID;

public interface UpdateUserStatusUseCase {

    User setUserStatus(UUID userId, boolean active);
}
