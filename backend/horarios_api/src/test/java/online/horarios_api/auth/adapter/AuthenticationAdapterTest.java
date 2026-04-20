package online.horarios_api.auth.adapter;

import online.horarios_api.auth.infrastructure.out.security.AuthenticationAdapter;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.security.AuthenticatedUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthenticationAdapter — tests unitarios")
class AuthenticationAdapterTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthenticationAdapter adapter;

    @Test
    @DisplayName("authenticate con credenciales válidas retorna UserInfo")
    void authenticate_validCredentials_returnsUserInfo() {
        UserInfo expectedUser = new UserInfo(UUID.randomUUID(), "user@continental.edu.pe", "Test User", "STUDENT", null);
        AuthenticatedUserDetails details = new AuthenticatedUserDetails(expectedUser, "hashed", List.of(), true);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(details);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);

        UserInfo result = adapter.authenticate("user@continental.edu.pe", "Password1!");

        assertThat(result).isEqualTo(expectedUser);
    }

    @Test
    @DisplayName("authenticate con credenciales inválidas lanza UnauthorizedException")
    void authenticate_badCredentials_throwsUnauthorized() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> adapter.authenticate("user@continental.edu.pe", "wrong"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Credenciales inválidas");
    }
}
