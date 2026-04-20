package online.horarios_api.token.infrastructure.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import online.horarios_api.token.domain.model.RefreshToken;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean revoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public RefreshToken toDomain() {
        return new RefreshToken(id, userId, tokenHash, expiresAt,
                revoked, revokedAt, ipAddress, userAgent, createdAt);
    }

    public static RefreshTokenEntity fromDomain(RefreshToken token) {
        return RefreshTokenEntity.builder()
                .id(token.getId())
                .userId(token.getUserId())
                .tokenHash(token.getTokenHash())
                .expiresAt(token.getExpiresAt())
                .revoked(token.isRevoked())
                .revokedAt(token.getRevokedAt())
                .ipAddress(token.getIpAddress())
                .userAgent(token.getUserAgent())
                .createdAt(token.getCreatedAt())
                .build();
    }
}
