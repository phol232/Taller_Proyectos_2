package online.horarios_api.auth.domain.port.in;

import java.util.UUID;

public interface LogoutUseCase {

    void logout(String rawRefreshToken);

    void logoutAll(UUID userId);
}
