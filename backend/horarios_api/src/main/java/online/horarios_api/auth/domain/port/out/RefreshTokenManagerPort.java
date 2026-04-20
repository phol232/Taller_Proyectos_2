package online.horarios_api.auth.domain.port.out;

import java.util.UUID;

public interface RefreshTokenManagerPort {

    String createRefreshToken(UUID userId, String ipAddress, String userAgent);

    UUID validateAndRotate(String rawToken);

    void revokeToken(String rawToken);

    void revokeAllTokensForUser(UUID userId);
}
