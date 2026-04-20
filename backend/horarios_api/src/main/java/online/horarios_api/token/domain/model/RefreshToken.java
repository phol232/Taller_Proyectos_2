package online.horarios_api.token.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class RefreshToken {

    private UUID id;
    private UUID userId;
    private String tokenHash;
    private Instant expiresAt;
    private boolean revoked;
    private Instant revokedAt;
    private String ipAddress;
    private String userAgent;
    private Instant createdAt;

    public static RefreshToken issueFor(UUID userId, String tokenHash,
                                        Instant expiresAt, String ipAddress,
                                        String userAgent) {
        return new RefreshToken(null, userId, tokenHash, expiresAt,
                false, null, ipAddress, userAgent, null);
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void revoke(Instant revokedAt) {
        this.revoked = true;
        this.revokedAt = revokedAt;
    }
}
