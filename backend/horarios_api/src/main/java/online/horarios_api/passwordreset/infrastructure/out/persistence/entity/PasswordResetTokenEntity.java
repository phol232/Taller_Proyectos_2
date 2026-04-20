package online.horarios_api.passwordreset.infrastructure.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import online.horarios_api.passwordreset.domain.model.PasswordResetToken;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "reset_token_hash", length = 64)
    private String resetTokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean used = false;

    @Column(name = "used_at")
    private Instant usedAt;

    @Builder.Default
    @Column(name = "verify_attempts", nullable = false)
    private int verifyAttempts = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    public PasswordResetToken toDomain() {
        return new PasswordResetToken(id, userId, otpHash, resetTokenHash, expiresAt,
                verified, verifiedAt, used, usedAt, verifyAttempts, createdAt);
    }

    public static PasswordResetTokenEntity fromDomain(PasswordResetToken token) {
        return PasswordResetTokenEntity.builder()
                .id(token.getId())
                .userId(token.getUserId())
                .otpHash(token.getOtpHash())
                .resetTokenHash(token.getResetTokenHash())
                .expiresAt(token.getExpiresAt())
                .verified(token.isVerified())
                .verifiedAt(token.getVerifiedAt())
                .used(token.isUsed())
                .usedAt(token.getUsedAt())
                .verifyAttempts(token.getVerifyAttempts())
                .createdAt(token.getCreatedAt())
                .build();
    }
}
