package online.horarios_api.user.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.in.FindUserByIdUseCase;
import online.horarios_api.user.domain.port.in.ListUsersUseCase;
import online.horarios_api.user.domain.port.in.SearchUsersByNameUseCase;
import online.horarios_api.user.domain.port.out.UserPort;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
public class UserQueryService implements ListUsersUseCase, FindUserByIdUseCase, SearchUsersByNameUseCase {

    private final UserPort userPort;

    @Override
    public List<User> listAllUsers() {
        return userPort.findAll();
    }

    @Override
    public Page<User> listAllUsersPaged(int page, int pageSize) {
        return userPort.findAllPaged(page, pageSize);
    }

    @Override
    public User findById(UUID id) {
        return userPort.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }

    @Override
    public List<User> searchByName(String query) {
        if (query == null || query.isBlank()) {
            return userPort.findAll();
        }
        return userPort.findByFullNameContaining(query.trim());
    }

    @Override
    public Page<User> searchByNamePaged(String query, int page, int pageSize) {
        if (query == null || query.isBlank()) {
            return userPort.findAllPaged(page, pageSize);
        }
        return userPort.findByFullNameContainingPaged(query.trim(), page, pageSize);
    }
}

