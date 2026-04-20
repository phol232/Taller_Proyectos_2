package online.horarios_api.passwordreset.infrastructure.out.user;

import lombok.RequiredArgsConstructor;
import online.horarios_api.passwordreset.domain.port.out.PasswordChangePort;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PasswordChangeAdapter implements PasswordChangePort {

    private final UserPort userPort;

    @Override
    public void changePassword(UUID userId, String newPasswordHash) {
        User user = userPort.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario asociado al token no encontrado"));
        user.changePasswordHash(newPasswordHash);
        userPort.save(user);
    }
}
