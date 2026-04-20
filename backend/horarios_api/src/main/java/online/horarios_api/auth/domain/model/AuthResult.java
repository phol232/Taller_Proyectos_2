package online.horarios_api.auth.domain.model;

import online.horarios_api.shared.domain.model.UserInfo;

public record AuthResult(
        UserInfo user,
        TokenPair tokenPair
) {}
