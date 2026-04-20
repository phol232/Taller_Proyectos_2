package online.horarios_api.auth.infrastructure.out.security;

import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.infrastructure.config.JwtProperties;
import org.springframework.stereotype.Component;

@Component
public class TokenConfigAdapter implements TokenConfigPort {

    private final JwtProperties jwtProperties;

    public TokenConfigAdapter(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @Override
    public long getAccessTokenExpirationSeconds() {
        return jwtProperties.accessTokenExpirationSeconds();
    }

    @Override
    public long getRefreshTokenExpirationSeconds() {
        return jwtProperties.refreshTokenExpirationSeconds();
    }
}
