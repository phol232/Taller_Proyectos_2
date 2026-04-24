package online.horarios_api.user.domain.port.in;

import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.user.domain.model.User;

import java.util.List;

public interface SearchUsersByNameUseCase {

    List<User> searchByName(String query);

    Page<User> searchByNamePaged(String query, int page, int pageSize);
}
