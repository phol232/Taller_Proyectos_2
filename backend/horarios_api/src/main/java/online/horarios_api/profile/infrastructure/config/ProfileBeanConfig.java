package online.horarios_api.profile.infrastructure.config;

import online.horarios_api.profile.application.usecase.ProfileService;
import online.horarios_api.profile.domain.port.out.ProfilePort;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
public class ProfileBeanConfig {

    @Bean
    public ProfileService profileService(ProfilePort profilePort,
                                         UserReadPort userReadPort) {
        return new ProfileService(profilePort, userReadPort);
    }
}
