package online.horarios_api.user.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class User {

    public static final String ALLOWED_EMAIL_DOMAIN = "continental.edu.pe";

    private UUID id;
    private String email;
    private String passwordHash;
    private String fullName;
    private Role role;
    private boolean active;
    private boolean emailVerified;
    private String avatarUrl;
    private Instant createdAt;
    private Instant updatedAt;

    public static boolean isAllowedEmail(String email) {
        return email != null && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
    }

    public static User registerOAuth2Student(String email, String fullName, String avatarUrl) {
        return new User(null, email, null, fullName, Role.STUDENT,
                true, true, avatarUrl, null, null);
    }

    public void changePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
