package online.horarios_api.auth.infrastructure.out.token;

import online.horarios_api.auth.domain.port.out.RefreshTokenManagerPort;
import online.horarios_api.token.domain.port.in.RefreshTokenUseCase;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class RefreshTokenManagerAdapter implements RefreshTokenManagerPort {

    private final RefreshTokenUseCase refreshTokenUseCase;

    public RefreshTokenManagerAdapter(RefreshTokenUseCase refreshTokenUseCase) {
        this.refreshTokenUseCase = refreshTokenUseCase;
    }

    @Override
    public String createRefreshToken(UUID userId, String ipAddress, String userAgent) {
        return refreshTokenUseCase.createRefreshToken(userId, ipAddress, userAgent);
    }

    @Override
    public UUID validateAndRotate(String rawToken) {
        return refreshTokenUseCase.validateAndRotate(rawToken);
    }

    @Override
    public void revokeToken(String rawToken) {
        refreshTokenUseCase.revokeToken(rawToken);
    }

    @Override
    public void revokeAllTokensForUser(UUID userId) {
        refreshTokenUseCase.revokeAllTokensForUser(userId);
    }
}
