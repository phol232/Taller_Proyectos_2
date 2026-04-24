package online.horarios_api.user.domain.port.in;

import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.domain.model.User;

public interface CreateUserUseCase {

    User createUser(String email,
                    String password,
                    String fullName,
                    Role role,
                    boolean active,
                    boolean emailVerified);
}
