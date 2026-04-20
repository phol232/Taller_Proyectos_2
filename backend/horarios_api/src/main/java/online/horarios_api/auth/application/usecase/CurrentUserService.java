package online.horarios_api.auth.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.domain.port.in.GetCurrentUserUseCase;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@RequiredArgsConstructor
public class CurrentUserService implements GetCurrentUserUseCase {

    private final UserReadPort userReadPort;

    @Override
    @Transactional(readOnly = true)
    public UserInfo getCurrentUser(UUID userId) {
        return userReadPort.findUserInfoById(userId)
                .orElseThrow(() -> new UnauthorizedException("Usuario no encontrado"));
    }
}
