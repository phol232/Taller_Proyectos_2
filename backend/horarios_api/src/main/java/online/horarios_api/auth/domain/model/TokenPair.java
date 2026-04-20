package online.horarios_api.auth.domain.model;

public record TokenPair(
        String accessToken,
        String refreshToken
) {}
