package online.horarios_api.shared.domain.model;

import java.util.UUID;

public record UserInfo(
    UUID   id,
    String email,
    String fullName,
    String role,
    String avatarUrl
) {}
