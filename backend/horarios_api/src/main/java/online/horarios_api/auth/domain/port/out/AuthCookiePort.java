package online.horarios_api.auth.domain.port.out;

import java.util.List;

public interface AuthCookiePort {

    String buildAccessTokenCookie(String accessToken);

    String buildRefreshTokenCookie(String refreshToken);

    List<String> buildExpiredCookies();
}