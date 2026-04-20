package online.horarios_api.passwordreset.domain.port.out;

import java.util.UUID;

public interface PasswordChangePort {

    void changePassword(UUID userId, String newPasswordHash);
}
