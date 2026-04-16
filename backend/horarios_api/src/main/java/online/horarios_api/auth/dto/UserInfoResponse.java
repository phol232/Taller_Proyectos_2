package online.horarios_api.auth.dto;

import java.util.UUID;

public record UserInfoResponse(
    UUID   id,
    String email,
    String fullName,
    String role,
    String avatarUrl
) {}
