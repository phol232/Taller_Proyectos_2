package online.horarios_api.passwordreset.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class PasswordResetToken {

    private UUID id;
    private UUID userId;

    private String otpHash;

    private String resetTokenHash;

    private Instant expiresAt;
    private boolean verified;
    private Instant verifiedAt;
    private boolean used;
    private Instant usedAt;
    private int verifyAttempts;
    private Instant createdAt;

    public static PasswordResetToken issueForUser(UUID userId, String otpHash, Instant expiresAt) {
        return new PasswordResetToken(null, userId, otpHash, null, expiresAt,
                false, null, false, null, 0, null);
    }

    public void incrementVerifyAttempts() {
        this.verifyAttempts++;
    }

    public boolean hasExceededAttempts(int maxAttempts) {
        return this.verifyAttempts > maxAttempts;
    }

    public void markVerified(String resetTokenHash, Instant verifiedAt) {
        this.resetTokenHash = resetTokenHash;
        this.verified = true;
        this.verifiedAt = verifiedAt;
    }

    public void markUsed(Instant usedAt) {
        this.used = true;
        this.usedAt = usedAt;
    }
}
