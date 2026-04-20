package online.horarios_api.shared.domain.port.out;

import online.horarios_api.shared.domain.model.UserInfo;

import java.util.Optional;
import java.util.UUID;

public interface UserReadPort {

    Optional<UserInfo> findUserInfoById(UUID id);

    Optional<UserInfo> findActiveUserInfoByEmail(String email);
}
