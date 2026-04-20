package online.horarios_api.auth.adapter;

import online.horarios_api.auth.domain.model.AuthResult;
import online.horarios_api.auth.domain.model.RequestMetadata;
import online.horarios_api.auth.domain.model.TokenPair;
import online.horarios_api.auth.domain.port.in.OAuth2AuthUseCase;
import online.horarios_api.auth.domain.port.out.AuthCookiePort;
import online.horarios_api.auth.infrastructure.in.web.OAuth2LoginSuccessHandler;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.model.OAuth2UserInfo;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import online.horarios_api.user.domain.port.in.OAuth2UserResolutionUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OAuth2LoginSuccessHandler — flujo OAuth2 post-autenticación")
class OAuth2LoginSuccessHandlerTest {

    @Mock private OAuth2AuthUseCase oAuth2AuthUseCase;
    @Mock private OAuth2UserResolutionUseCase oAuth2UserResolutionUseCase;
    @Mock private AppProperties appProperties;
    @Mock private AppProperties.FrontendProperties frontendProperties;
    @Mock private AuthCookiePort cookiePort;

    private OAuth2LoginSuccessHandler handler;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    private static final String FRONTEND_URL = "http://localhost:3000";

    @BeforeEach
    void setUp() {
        when(appProperties.frontend()).thenReturn(frontendProperties);
        when(frontendProperties.url()).thenReturn(FRONTEND_URL);

        handler = new OAuth2LoginSuccessHandler(
                oAuth2AuthUseCase,
                oAuth2UserResolutionUseCase,
                appProperties,
                cookiePort
        );

        request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        request.addHeader("User-Agent", "TestBrowser/1.0");
        response = new MockHttpServletResponse();
    }

    // ── happy path ───────────────────────────────────────────────────

    @Test
    @DisplayName("login OAuth2 exitoso → setea cookies y redirige a /callback")
    void onAuthenticationSuccess_happyPath_setsCookiesAndRedirects() throws Exception {
        OAuth2AuthenticationToken token = buildOAuth2Token("google");
        UserInfo userInfo = new UserInfo(UUID.randomUUID(), "user@continental.edu.pe",
                "Test User", "STUDENT", null);
        TokenPair tokenPair = new TokenPair("access-jwt", "refresh-opaque");
        AuthResult authResult = new AuthResult(userInfo, tokenPair);

        when(oAuth2UserResolutionUseCase.findOrCreateOAuth2User(any(OAuth2UserInfo.class)))
                .thenReturn(userInfo);
        when(oAuth2AuthUseCase.loginOAuth2(eq(userInfo), any(RequestMetadata.class)))
                .thenReturn(authResult);
        when(cookiePort.buildAccessTokenCookie("access-jwt")).thenReturn("access_token=access-jwt; HttpOnly");
        when(cookiePort.buildRefreshTokenCookie("refresh-opaque")).thenReturn("refresh_token=refresh-opaque; HttpOnly");

        handler.onAuthenticationSuccess(request, response, token);

        verify(cookiePort).buildAccessTokenCookie("access-jwt");
        verify(cookiePort).buildRefreshTokenCookie("refresh-opaque");
        assertThat(response.getHeaders("Set-Cookie")).contains("access_token=access-jwt; HttpOnly", "refresh_token=refresh-opaque; HttpOnly");
        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND_URL + "/callback");
    }

    // ── dominio no permitido (BadRequestException) ───────────────────

    @Test
    @DisplayName("dominio no permitido → redirige a /login?error=domain_not_allowed")
    void onAuthenticationSuccess_domainNotAllowed_redirectsWithError() throws Exception {
        OAuth2AuthenticationToken token = buildOAuth2Token("google");

        when(oAuth2UserResolutionUseCase.findOrCreateOAuth2User(any(OAuth2UserInfo.class)))
                .thenThrow(new BadRequestException("domain_not_allowed"));

        handler.onAuthenticationSuccess(request, response, token);

        assertThat(response.getRedirectedUrl())
                .isEqualTo(FRONTEND_URL + "/login?error=domain_not_allowed");
        verifyNoInteractions(oAuth2AuthUseCase, cookiePort);
    }

    // ── excepción inesperada ─────────────────────────────────────────

    @Test
    @DisplayName("error inesperado → redirige a /login?error=oauth2_failed")
    void onAuthenticationSuccess_unexpectedError_redirectsGenericError() throws Exception {
        OAuth2AuthenticationToken token = buildOAuth2Token("google");

        when(oAuth2UserResolutionUseCase.findOrCreateOAuth2User(any(OAuth2UserInfo.class)))
                .thenThrow(new RuntimeException("DB connection failed"));

        handler.onAuthenticationSuccess(request, response, token);

        assertThat(response.getRedirectedUrl())
                .isEqualTo(FRONTEND_URL + "/login?error=oauth2_failed");
    }

    // ── principal no OidcUser ────────────────────────────────────────

    @Test
    @DisplayName("principal no es OidcUser → redirige a /login?error=oauth2_failed")
    void onAuthenticationSuccess_notOidcUser_redirectsError() throws Exception {
        // OAuth2User genérico (no OIDC)
        org.springframework.security.oauth2.core.user.OAuth2User plainUser =
                mock(org.springframework.security.oauth2.core.user.OAuth2User.class);
        OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
                plainUser, java.util.Collections.emptyList(), "github"
        );

        handler.onAuthenticationSuccess(request, response, token);

        assertThat(response.getRedirectedUrl())
                .isEqualTo(FRONTEND_URL + "/login?error=oauth2_failed");
        verifyNoInteractions(oAuth2UserResolutionUseCase, oAuth2AuthUseCase, cookiePort);
    }

    // ── X-Forwarded-For ──────────────────────────────────────────────

    @Test
    @DisplayName("X-Forwarded-For presente → usa primera IP como client IP")
    void onAuthenticationSuccess_xForwardedFor_usesFirstIp() throws Exception {
        request.addHeader("X-Forwarded-For", "10.0.0.1, 10.0.0.2");
        OAuth2AuthenticationToken token = buildOAuth2Token("google");
        UserInfo userInfo = new UserInfo(UUID.randomUUID(), "user@continental.edu.pe",
                "Test User", "STUDENT", null);
        TokenPair tokenPair = new TokenPair("access-jwt", "refresh-opaque");
        AuthResult authResult = new AuthResult(userInfo, tokenPair);

        when(oAuth2UserResolutionUseCase.findOrCreateOAuth2User(any(OAuth2UserInfo.class)))
                .thenReturn(userInfo);
        when(oAuth2AuthUseCase.loginOAuth2(eq(userInfo), any(RequestMetadata.class)))
                .thenReturn(authResult);
        when(cookiePort.buildAccessTokenCookie(any())).thenReturn("access_token=at; Path=/; HttpOnly");
        when(cookiePort.buildRefreshTokenCookie(any())).thenReturn("refresh_token=rt; Path=/; HttpOnly");

        handler.onAuthenticationSuccess(request, response, token);

        verify(oAuth2AuthUseCase).loginOAuth2(eq(userInfo),
                argThat(meta -> "10.0.0.1".equals(meta.ipAddress())));
    }

    // ── helpers ──────────────────────────────────────────────────────

    private OAuth2AuthenticationToken buildOAuth2Token(String registrationId) {
        OidcIdToken idToken = new OidcIdToken(
                "id-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of(
                        "sub", "oauth2-subject-123",
                        "email", "user@continental.edu.pe",
                        "name", "Test User",
                        "picture", "https://example.com/avatar.jpg",
                        "iss", "https://accounts.google.com",
                        "aud", java.util.List.of("client-id")
                )
        );
        OidcUser oidcUser = new DefaultOidcUser(
                java.util.Collections.emptyList(),
                idToken
        );
        return new OAuth2AuthenticationToken(
                oidcUser, java.util.Collections.emptyList(), registrationId
        );
    }
}
