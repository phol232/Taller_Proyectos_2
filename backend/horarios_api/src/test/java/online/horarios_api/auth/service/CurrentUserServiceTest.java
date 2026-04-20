package online.horarios_api.auth.service;

import online.horarios_api.auth.application.usecase.CurrentUserService;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CurrentUserService — obtener usuario actual")
class CurrentUserServiceTest {

    @Mock private UserReadPort userReadPort;

    @InjectMocks
    private CurrentUserService service;

    @Test
    @DisplayName("getCurrentUser: usuario existente → retorna UserInfo")
    void getCurrentUser_existingUser_returnsUserInfo() {
        UUID userId = UUID.randomUUID();
        UserInfo expected = new UserInfo(userId, "user@continental.edu.pe",
                "Usuario Test", "STUDENT", null);
        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.of(expected));

        UserInfo result = service.getCurrentUser(userId);

        assertThat(result).isEqualTo(expected);
        assertThat(result.id()).isEqualTo(userId);
        assertThat(result.email()).isEqualTo("user@continental.edu.pe");
    }

    @Test
    @DisplayName("getCurrentUser: usuario no encontrado → lanza UnauthorizedException")
    void getCurrentUser_notFound_throwsUnauthorized() {
        UUID userId = UUID.randomUUID();
        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCurrentUser(userId))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Usuario no encontrado");
    }
}
