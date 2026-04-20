package online.horarios_api.auth.infrastructure.out.security;

import lombok.RequiredArgsConstructor;
import online.horarios_api.auth.domain.port.out.AuthCookiePort;
import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.infrastructure.config.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CookieService implements AuthCookiePort {

    static final String ACCESS_TOKEN_COOKIE  = "access_token";
    static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private final AppProperties  appProperties;
    private final TokenConfigPort tokenConfigPort;

    @Override
    public String buildAccessTokenCookie(String accessToken) {
        return buildAuthCookie(
                ACCESS_TOKEN_COOKIE,
                accessToken,
                tokenConfigPort.getAccessTokenExpirationSeconds()
        ).toString();
    }

    @Override
    public String buildRefreshTokenCookie(String refreshToken) {
        return buildAuthCookie(
                REFRESH_TOKEN_COOKIE,
                refreshToken,
                tokenConfigPort.getRefreshTokenExpirationSeconds()
        ).toString();
    }

    @Override
    public List<String> buildExpiredCookies() {
        return List.of(
                buildExpiredCookie(ACCESS_TOKEN_COOKIE).toString(),
                buildExpiredCookie(REFRESH_TOKEN_COOKIE).toString()
        );
    }

    private ResponseCookie buildAuthCookie(String name, String value, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(appProperties.security().cookie().secure())
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .sameSite("Strict")
                .build();
    }

    private ResponseCookie buildExpiredCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(appProperties.security().cookie().secure())
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }
}
