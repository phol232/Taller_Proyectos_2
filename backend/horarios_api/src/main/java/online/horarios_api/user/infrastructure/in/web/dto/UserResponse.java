package online.horarios_api.user.infrastructure.in.web.dto;

import online.horarios_api.user.domain.model.User;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID    id,
        String  email,
        String  passwordHash,
        String  fullName,
        String  role,
        boolean active,
        boolean emailVerified,
        String  avatarUrl,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash() == null ? null : "[PROTECTED]",
                user.getFullName(),
                user.getRole().name(),
                user.isActive(),
                user.isEmailVerified(),
                user.getAvatarUrl(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
