package online.horarios_api.user.domain.port.in;

import online.horarios_api.user.domain.model.User;

import java.util.UUID;

public interface FindUserByIdUseCase {

    User findById(UUID id);
}
