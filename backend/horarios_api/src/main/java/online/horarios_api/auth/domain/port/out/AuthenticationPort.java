package online.horarios_api.auth.domain.port.out;

import online.horarios_api.shared.domain.model.UserInfo;

public interface AuthenticationPort {

    UserInfo authenticate(String email, String password);
}
