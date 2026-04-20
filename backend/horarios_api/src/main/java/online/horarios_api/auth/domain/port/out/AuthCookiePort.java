package online.horarios_api.auth.domain.port.out;

import java.util.List;

/**
 * Puerto de salida — generación de valores de cookies de autenticación.
 * <p>
 * Retorna los valores Set-Cookie como strings.
 * La escritura en la respuesta HTTP es responsabilidad del caller (controller/handler).
 */
public interface AuthCookiePort {

    String buildAccessTokenCookie(String accessToken);

    String buildRefreshTokenCookie(String refreshToken);

    List<String> buildExpiredCookies();
}