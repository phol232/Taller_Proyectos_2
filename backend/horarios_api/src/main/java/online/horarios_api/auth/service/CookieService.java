package online.horarios_api.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import online.horarios_api.config.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class CookieService {

    static final String ACCESS_TOKEN_COOKIE  = "access_token";
    static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private final AppProperties appProperties;
    private final JwtService    jwtService;

    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        ResponseCookie cookie = buildAuthCookie(
                ACCESS_TOKEN_COOKIE,
                accessToken,
                jwtService.getAccessTokenExpirationSeconds()
        );
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = buildAuthCookie(
                REFRESH_TOKEN_COOKIE,
                refreshToken,
                jwtService.getRefreshTokenExpirationSeconds()
        );
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearAuthCookies(HttpServletResponse response) {
        response.addHeader("Set-Cookie", buildExpiredCookie(ACCESS_TOKEN_COOKIE).toString());
        response.addHeader("Set-Cookie", buildExpiredCookie(REFRESH_TOKEN_COOKIE).toString());
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
