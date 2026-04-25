package online.horarios_api.auth.adapter;

import online.horarios_api.auth.infrastructure.out.security.CookieService;
import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CookieService — generación de valores Set-Cookie")
class CookieServiceTest {

    @Mock private AppProperties appProperties;
    @Mock private AppProperties.SecurityProperties securityProperties;
    @Mock private AppProperties.SecurityProperties.CookieProperties cookieProperties;
    @Mock private TokenConfigPort tokenConfigPort;

    private CookieService cookieService;

    @BeforeEach
    void setUp() {
        when(appProperties.security()).thenReturn(securityProperties);
        when(securityProperties.cookie()).thenReturn(cookieProperties);
        when(cookieProperties.secure()).thenReturn(true);

        cookieService = new CookieService(appProperties, tokenConfigPort);
    }

    @Test
    @DisplayName("buildAccessTokenCookie: secure=true genera cookie cross-site con SameSite=None")
    void buildAccessTokenCookie_setsCorrectAttributes() {
        when(tokenConfigPort.getAccessTokenExpirationSeconds()).thenReturn(900L);

        String cookie = cookieService.buildAccessTokenCookie("test-access-jwt");

        assertThat(cookie)
                .contains("access_token=test-access-jwt")
                .contains("HttpOnly")
                .contains("Secure")
            .contains("SameSite=None")
                .contains("Max-Age=900")
                .contains("Path=/");
    }

    @Test
    @DisplayName("buildRefreshTokenCookie: genera cookie con Max-Age de refresh token")
    void buildRefreshTokenCookie_setsCorrectMaxAge() {
        when(tokenConfigPort.getRefreshTokenExpirationSeconds()).thenReturn(604800L);

        String cookie = cookieService.buildRefreshTokenCookie("test-refresh-opaque");

        assertThat(cookie)
                .contains("refresh_token=test-refresh-opaque")
                .contains("Max-Age=604800")
                .contains("HttpOnly");
    }

    @Test
    @DisplayName("buildExpiredCookies: retorna ambas cookies con Max-Age=0")
    void buildExpiredCookies_returnsBothExpired() {
        List<String> cookies = cookieService.buildExpiredCookies();

        assertThat(cookies).hasSize(2);

        String accessCookie = cookies.stream()
                .filter(c -> c.startsWith("access_token="))
                .findFirst().orElseThrow();
        String refreshCookie = cookies.stream()
                .filter(c -> c.startsWith("refresh_token="))
                .findFirst().orElseThrow();

        assertThat(accessCookie).contains("Max-Age=0");
        assertThat(refreshCookie).contains("Max-Age=0");
    }

    // ── secure=false ─────────────────────────────────────────────────

    @Test
    @DisplayName("buildAccessTokenCookie: secure=false usa SameSite=Lax y omite Secure")
    void buildAccessTokenCookie_notSecure_omitsSecureFlag() {
        when(cookieProperties.secure()).thenReturn(false);
        cookieService = new CookieService(appProperties, tokenConfigPort);
        when(tokenConfigPort.getAccessTokenExpirationSeconds()).thenReturn(900L);

        String cookie = cookieService.buildAccessTokenCookie("dev-token");

        assertThat(cookie)
                .contains("access_token=dev-token")
            .contains("SameSite=Lax")
            .doesNotContain("Secure");
    }
}
