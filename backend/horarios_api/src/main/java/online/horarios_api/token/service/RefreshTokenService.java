package online.horarios_api.token.service;

import lombok.RequiredArgsConstructor;
import online.horarios_api.config.JwtProperties;
import online.horarios_api.token.dto.SessionResponse;
import online.horarios_api.token.entity.RefreshToken;
import online.horarios_api.token.repository.RefreshTokenRepository;
import online.horarios_api.user.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    @Transactional
    public String createRefreshToken(User user, String ipAddress, String userAgent) {
        byte[] tokenBytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        refreshTokenRepository.deleteExpiredOrRevokedByUserId(user.getId(), Instant.now());

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(rawToken))
                .expiresAt(Instant.now().plusSeconds(jwtProperties.refreshTokenExpirationSeconds()))
                .ipAddress(sanitizeIp(ipAddress))
                .userAgent(sanitizeUserAgent(userAgent))
                .build();

        refreshTokenRepository.save(token);
        return rawToken;
    }

    @Transactional
    public User validateAndRotate(String rawToken) {
        String hash = hashToken(rawToken);

        RefreshToken token = refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Refresh token inválido o revocado"));

        if (token.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.revokeByTokenHash(hash, Instant.now());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado");
        }

        refreshTokenRepository.revokeByTokenHash(hash, Instant.now());
        return token.getUser();
    }

    @Transactional
    public void revokeToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokenRepository.revokeByTokenHash(hashToken(rawToken), Instant.now());
    }

    @Transactional
    public void revokeAllTokensForUser(User user) {
        refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listActiveSessions(UUID userId) {
        return refreshTokenRepository
                .findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(userId, Instant.now())
                .stream()
                .map(t -> new SessionResponse(
                        t.getId(),
                        t.getIpAddress(),
                        t.getUserAgent(),
                        t.getCreatedAt(),
                        t.getExpiresAt()))
                .toList();
    }

    @Transactional
    public void revokeSessionById(UUID sessionId, UUID requestingUserId) {
        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));
        if (!token.getUser().getId().equals(requestingUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
        if (!token.isRevoked()) {
            refreshTokenRepository.revokeByTokenHash(token.getTokenHash(), Instant.now());
        }
    }

    @Scheduled(fixedRateString = "PT6H")
    @Transactional
    public void cleanUpExpiredTokens() {
        refreshTokenRepository.deleteAllExpiredOrRevoked(Instant.now());
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private String sanitizeIp(String ip) {
        if (ip == null) return null;
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }

    private String sanitizeUserAgent(String ua) {
        if (ua == null) return null;
        return ua.length() > 512 ? ua.substring(0, 512) : ua;
    }
}
