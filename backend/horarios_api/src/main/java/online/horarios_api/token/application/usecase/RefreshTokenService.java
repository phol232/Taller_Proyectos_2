package online.horarios_api.token.application.usecase;

import lombok.RequiredArgsConstructor;
import online.horarios_api.shared.domain.exception.ForbiddenException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.shared.domain.exception.UnauthorizedException;
import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.token.domain.model.RefreshToken;
import online.horarios_api.token.domain.model.SessionInfo;
import online.horarios_api.token.domain.port.in.RefreshTokenUseCase;
import online.horarios_api.token.domain.port.in.TokenMaintenanceUseCase;
import online.horarios_api.token.domain.port.out.RefreshTokenPort;

import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
public class RefreshTokenService implements RefreshTokenUseCase, TokenMaintenanceUseCase {

    private final RefreshTokenPort refreshTokenPort;
    private final TokenConfigPort  tokenConfigPort;
    private final TokenHasherPort  tokenHasherPort;

    @Override
    @Transactional
    public String createRefreshToken(UUID userId, String ipAddress, String userAgent) {
        String rawToken = tokenHasherPort.generateRawToken();

        refreshTokenPort.deleteExpiredOrRevokedByUserId(userId, Instant.now());

        RefreshToken token = RefreshToken.issueFor(
                userId,
                tokenHasherPort.hash(rawToken),
                Instant.now().plusSeconds(tokenConfigPort.getRefreshTokenExpirationSeconds()),
                sanitizeIp(ipAddress),
                sanitizeUserAgent(userAgent)
        );

        refreshTokenPort.save(token);
        return rawToken;
    }

    @Override
    @Transactional
    public UUID validateAndRotate(String rawToken) {
        String hash = tokenHasherPort.hash(rawToken);

        RefreshToken token = refreshTokenPort.findActiveByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Refresh token inválido o revocado"));

        if (token.isExpired()) {
            refreshTokenPort.revokeByTokenHash(hash, Instant.now());
            throw new UnauthorizedException("Refresh token expirado");
        }

        refreshTokenPort.revokeByTokenHash(hash, Instant.now());
        return token.getUserId();
    }

    @Override
    @Transactional
    public void revokeToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokenPort.revokeByTokenHash(tokenHasherPort.hash(rawToken), Instant.now());
    }

    @Override
    @Transactional
    public void revokeAllTokensForUser(UUID userId) {
        refreshTokenPort.revokeAllByUserId(userId, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionInfo> listActiveSessions(UUID userId) {
        return refreshTokenPort
                .findActiveSessionsByUserId(userId, Instant.now())
                .stream()
                .map(t -> new SessionInfo(
                        t.getId(),
                        t.getIpAddress(),
                        t.getUserAgent(),
                        t.getCreatedAt(),
                        t.getExpiresAt()))
                .toList();
    }

    @Override
    @Transactional
    public void revokeSessionById(UUID sessionId, UUID requestingUserId) {
        RefreshToken token = refreshTokenPort.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Sesión no encontrada"));
        if (!token.getUserId().equals(requestingUserId)) {
            throw new ForbiddenException("No autorizado");
        }
        if (!token.isRevoked()) {
            refreshTokenPort.revokeByTokenHash(token.getTokenHash(), Instant.now());
        }
    }

    @Override
    @Transactional
    public void cleanUpExpiredTokens() {
        refreshTokenPort.deleteAllExpiredOrRevoked(Instant.now());
    }

    private String sanitizeIp(String ip) {
        if (ip == null) return null;
        String trimmed = ip.trim();
        return trimmed.length() > 45 ? trimmed.substring(0, 45) : trimmed;
    }

    private String sanitizeUserAgent(String ua) {
        if (ua == null) return null;
        return ua.length() > 500 ? ua.substring(0, 500) : ua;
    }
}
