package online.horarios_api.user.domain.port.in;

import online.horarios_api.user.domain.model.User;

import java.util.List;

public interface ListUsersUseCase {

    List<User> listAllUsers();
}
