package online.horarios_api.shared.domain.model;

public record OAuth2UserInfo(
        String subject,
        String email,
        String fullName,
        String picture,
        String provider
) {}
