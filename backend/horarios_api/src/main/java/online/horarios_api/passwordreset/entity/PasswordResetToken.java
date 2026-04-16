package online.horarios_api.passwordreset.entity;

import jakarta.persistence.*;
import lombok.*;
import online.horarios_api.user.entity.User;
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
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_prt_user"))
    private User user;

    /** BCrypt hash del código OTP de 6 dígitos. Nunca se almacena en claro. */
    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    /** SHA-256 hex del token de reset emitido tras verificar el OTP. */
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
}
