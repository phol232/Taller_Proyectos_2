package online.horarios_api.auth.infrastructure.config;

import online.horarios_api.auth.application.usecase.AuthService;
import online.horarios_api.auth.application.usecase.CurrentUserService;
import online.horarios_api.auth.domain.port.out.AuthenticationPort;
import online.horarios_api.auth.domain.port.out.JwtGeneratorPort;
import online.horarios_api.auth.domain.port.out.RefreshTokenManagerPort;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
public class AuthBeanConfig {

    @Bean
    public AuthService authService(AuthenticationPort authenticationPort,
                                   JwtGeneratorPort jwtGeneratorPort,
                                   RefreshTokenManagerPort refreshTokenManagerPort,
                                   UserReadPort userReadPort) {
        return new AuthService(authenticationPort, jwtGeneratorPort,
                refreshTokenManagerPort, userReadPort);
    }

    @Bean
    public CurrentUserService currentUserService(UserReadPort userReadPort) {
        return new CurrentUserService(userReadPort);
    }
}
