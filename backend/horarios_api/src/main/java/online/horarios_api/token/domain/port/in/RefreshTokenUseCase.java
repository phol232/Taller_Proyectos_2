package online.horarios_api.token.domain.port.in;

import online.horarios_api.token.domain.model.SessionInfo;

import java.util.List;
import java.util.UUID;

public interface RefreshTokenUseCase {

    String createRefreshToken(UUID userId, String ipAddress, String userAgent);

    UUID validateAndRotate(String rawToken);

    void revokeToken(String rawToken);

    void revokeAllTokensForUser(UUID userId);

    List<SessionInfo> listActiveSessions(UUID userId);

    void revokeSessionById(UUID sessionId, UUID requestingUserId);
}
