package online.horarios_api.user.infrastructure.config;

import online.horarios_api.user.application.usecase.UserQueryService;
import online.horarios_api.user.application.usecase.UserService;
import online.horarios_api.user.domain.port.out.UserPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserBeanConfig {

    @Bean
    public UserService userService(UserPort userPort) {
        return new UserService(userPort);
    }

    @Bean
    public UserQueryService userQueryService(UserPort userPort) {
        return new UserQueryService(userPort);
    }
}
