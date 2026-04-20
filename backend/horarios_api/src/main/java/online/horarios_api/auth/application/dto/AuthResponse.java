package online.horarios_api.auth.application.dto;

import online.horarios_api.shared.domain.model.UserInfo;

public record AuthResponse(UserInfo user) {}
