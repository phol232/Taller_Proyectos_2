package online.horarios_api.auth.service;

import online.horarios_api.auth.application.usecase.AuthService;
import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.auth.domain.port.out.AuthenticationPort;
import online.horarios_api.auth.domain.port.out.JwtGeneratorPort;
import online.horarios_api.auth.domain.port.out.RefreshTokenManagerPort;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — lógica de negocio de autenticación")
class AuthServiceTest {

    @Mock private AuthenticationPort authenticationPort;
    @Mock private JwtGeneratorPort jwtGeneratorPort;
    @Mock private RefreshTokenManagerPort refreshTokenManagerPort;
    @Mock private UserReadPort userReadPort;

    @InjectMocks
    private AuthService service;

    private UserInfo userInfo;
    private RequestMetadata metadata;

    @BeforeEach
    void setUp() {
        userInfo = new UserInfo(UUID.randomUUID(), "user@continental.edu.pe",
                "Usuario Test", "STUDENT", null);
        metadata = new RequestMetadata("127.0.0.1", "TestAgent/1.0");
    }

    // ── login ────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: credenciales válidas → retorna AuthResult con tokens")
    void login_validCredentials_returnsAuthResult() {
        when(authenticationPort.authenticate("user@continental.edu.pe", "Password1!"))
                .thenReturn(userInfo);
        when(jwtGeneratorPort.generateAccessToken(userInfo)).thenReturn("access-jwt");
        when(refreshTokenManagerPort.createRefreshToken(eq(userInfo.id()), any(), any()))
                .thenReturn("refresh-opaque");

        AuthResult result = service.login("user@continental.edu.pe", "Password1!", metadata);

        assertThat(result.user()).isEqualTo(userInfo);
        assertThat(result.tokenPair().accessToken()).isEqualTo("access-jwt");
        assertThat(result.tokenPair().refreshToken()).isEqualTo("refresh-opaque");
    }

    @Test
    @DisplayName("login: credenciales inválidas → propaga UnauthorizedException")
    void login_invalidCredentials_throwsUnauthorized() {
        when(authenticationPort.authenticate(any(), any()))
                .thenThrow(new UnauthorizedException("Credenciales inválidas"));

        assertThatThrownBy(() -> service.login("user@continental.edu.pe", "wrong", metadata))
                .isInstanceOf(UnauthorizedException.class);
    }

    // ── loginOAuth2 ──────────────────────────────────────────────────

    @Test
    @DisplayName("loginOAuth2: usuario OAuth2 → retorna AuthResult con tokens")
    void loginOAuth2_returnsAuthResult() {
        when(jwtGeneratorPort.generateAccessToken(userInfo)).thenReturn("access-jwt");
        when(refreshTokenManagerPort.createRefreshToken(eq(userInfo.id()), any(), any()))
                .thenReturn("refresh-opaque");

        AuthResult result = service.loginOAuth2(userInfo, metadata);

        assertThat(result.user()).isEqualTo(userInfo);
        assertThat(result.tokenPair().accessToken()).isEqualTo("access-jwt");
        assertThat(result.tokenPair().refreshToken()).isEqualTo("refresh-opaque");
    }

    // ── refresh ──────────────────────────────────────────────────────

    @Test
    @DisplayName("refresh: token válido → rota token y retorna AuthResult")
    void refresh_validToken_returnsAuthResult() {
        UUID userId = userInfo.id();
        when(refreshTokenManagerPort.validateAndRotate("old-refresh")).thenReturn(userId);
        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.of(userInfo));
        when(jwtGeneratorPort.generateAccessToken(userInfo)).thenReturn("new-access");
        when(refreshTokenManagerPort.createRefreshToken(eq(userId), any(), any()))
                .thenReturn("new-refresh");

        AuthResult result = service.refresh("old-refresh", metadata);

        assertThat(result.user()).isEqualTo(userInfo);
        assertThat(result.tokenPair().accessToken()).isEqualTo("new-access");
        assertThat(result.tokenPair().refreshToken()).isEqualTo("new-refresh");
    }

    @Test
    @DisplayName("refresh: token null → lanza UnauthorizedException")
    void refresh_nullToken_throwsUnauthorized() {
        assertThatThrownBy(() -> service.refresh(null, metadata))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Refresh token no encontrado");
    }

    @Test
    @DisplayName("refresh: token en blanco → lanza UnauthorizedException")
    void refresh_blankToken_throwsUnauthorized() {
        assertThatThrownBy(() -> service.refresh("   ", metadata))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Refresh token no encontrado");
    }

    @Test
    @DisplayName("refresh: usuario no encontrado tras rotación → lanza UnauthorizedException")
    void refresh_userNotFound_throwsUnauthorized() {
        UUID userId = UUID.randomUUID();
        when(refreshTokenManagerPort.validateAndRotate("some-token")).thenReturn(userId);
        when(userReadPort.findUserInfoById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("some-token", metadata))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Usuario no encontrado");
    }

    // ── logout ───────────────────────────────────────────────────────

    @Test
    @DisplayName("logout: revoca el refresh token")
    void logout_revokesRefreshToken() {
        service.logout("refresh-to-revoke");

        verify(refreshTokenManagerPort).revokeToken("refresh-to-revoke");
    }

    // ── logoutAll ────────────────────────────────────────────────────

    @Test
    @DisplayName("logoutAll: revoca todos los tokens del usuario")
    void logoutAll_revokesAllTokensForUser() {
        UUID userId = UUID.randomUUID();

        service.logoutAll(userId);

        verify(refreshTokenManagerPort).revokeAllTokensForUser(userId);
    }
}
