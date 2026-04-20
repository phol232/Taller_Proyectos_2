package online.horarios_api.token.infrastructure.config;

import online.horarios_api.shared.domain.port.out.TokenConfigPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.token.application.usecase.RefreshTokenService;
import online.horarios_api.token.domain.port.out.RefreshTokenPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TokenBeanConfig {

    @Bean
    public RefreshTokenService refreshTokenService(RefreshTokenPort refreshTokenPort,
                                                   TokenConfigPort tokenConfigPort,
                                                   TokenHasherPort tokenHasherPort) {
        return new RefreshTokenService(refreshTokenPort, tokenConfigPort, tokenHasherPort);
    }
}
