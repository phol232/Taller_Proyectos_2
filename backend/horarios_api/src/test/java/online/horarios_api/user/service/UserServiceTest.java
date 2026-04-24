package online.horarios_api.user.service;

import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.model.OAuth2UserInfo;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.user.application.usecase.UserService;
import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.domain.model.User;
import online.horarios_api.user.domain.port.out.UserPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — resolución OAuth2")
class UserServiceTest {

    @Mock private UserPort userPort;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService service;

    @Test
    @DisplayName("findOrCreateOAuth2User: dominio inválido → lanza BadRequestException")
    void findOrCreateOAuth2User_invalidDomain_throws() {
        OAuth2UserInfo oauth2UserInfo = new OAuth2UserInfo(
                "subject",
                "user@gmail.com",
                "Usuario Test",
                null,
                "google"
        );

        assertThatThrownBy(() -> service.findOrCreateOAuth2User(oauth2UserInfo))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("domain_not_allowed");
    }

    @Test
    @DisplayName("findOrCreateOAuth2User: cuenta vinculada existente → devuelve UserInfo")
    void findOrCreateOAuth2User_existingLinkedAccount_returnsUserInfo() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId, "user@continental.edu.pe");
        OAuth2LinkedAccount link = new OAuth2LinkedAccount(
                UUID.randomUUID(), userId, "google", "subject", user.getEmail(), null);
        OAuth2UserInfo oauth2UserInfo = new OAuth2UserInfo(
                "subject",
                user.getEmail(),
                user.getFullName(),
                null,
                "google"
        );

        when(userPort.findOAuth2Account("google", "subject"))
                .thenReturn(Optional.of(link));
        when(userPort.findById(userId)).thenReturn(Optional.of(user));

        UserInfo result = service.findOrCreateOAuth2User(oauth2UserInfo);

        assertThat(result.id()).isEqualTo(userId);
        assertThat(result.email()).isEqualTo(user.getEmail());
        assertThat(result.role()).isEqualTo("STUDENT");
    }

    @Test
    @DisplayName("findOrCreateOAuth2User: usuario nuevo → crea usuario student y vincula cuenta")
    void findOrCreateOAuth2User_newUser_createsAndLinksAccount() {
        UUID userId = UUID.randomUUID();
        OAuth2UserInfo oauth2UserInfo = new OAuth2UserInfo(
                "subject",
                "new@continental.edu.pe",
                "Usuario Nuevo",
                "https://avatar.test",
                "google"
        );

        when(userPort.findOAuth2Account("google", "subject"))
                .thenReturn(Optional.empty());
        when(userPort.findByEmail("new@continental.edu.pe")).thenReturn(Optional.empty());
        when(userPort.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            return new User(userId, saved.getEmail(), saved.getPasswordHash(),
                    saved.getFullName(), saved.getRole(), saved.isActive(),
                    saved.isEmailVerified(), saved.getAvatarUrl(), null, null);
        });

        UserInfo result = service.findOrCreateOAuth2User(oauth2UserInfo);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userPort).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(Role.STUDENT);
        assertThat(userCaptor.getValue().isEmailVerified()).isTrue();
        assertThat(userCaptor.getValue().getAvatarUrl()).isEqualTo("https://avatar.test");
        verify(userPort).saveOAuth2Account(any(OAuth2LinkedAccount.class));
        assertThat(result.id()).isEqualTo(userId);
        assertThat(result.email()).isEqualTo("new@continental.edu.pe");
    }

    @Test
    @DisplayName("setUserStatus: desactiva usuario y delega sincronización al puerto")
    void setUserStatus_deactivatesUser() {
        UUID userId = UUID.randomUUID();
        User inactive = new User(userId, "user@continental.edu.pe", null, "Usuario Test",
                Role.STUDENT, false, false, null, null, null);

        when(userPort.findById(userId)).thenReturn(Optional.of(inactive));
        when(userPort.setAccessStatus(userId, false)).thenReturn(inactive);

        User result = service.setUserStatus(userId, false);

        assertThat(result.isActive()).isFalse();
        assertThat(result.isEmailVerified()).isFalse();
    }

    private User buildUser(UUID id, String email) {
        return new User(id, email, null, "Usuario Test", Role.STUDENT,
                true, true, null, null, null);
    }
}
