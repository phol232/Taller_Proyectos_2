package online.horarios_api.passwordreset.infrastructure.config;

import online.horarios_api.passwordreset.application.usecase.PasswordResetService;
import online.horarios_api.passwordreset.domain.port.out.NotificationPort;
import online.horarios_api.passwordreset.domain.port.out.OtpGeneratorPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordChangePort;
import online.horarios_api.passwordreset.domain.port.out.PasswordHasherPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetConfigPort;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetTokenPort;
import online.horarios_api.shared.domain.port.out.TokenHasherPort;
import online.horarios_api.shared.domain.port.out.UserReadPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PasswordResetBeanConfig {

    @Bean
    public PasswordResetService passwordResetService(UserReadPort userReadPort,
                                                     PasswordResetTokenPort tokenPort,
                                                     PasswordHasherPort passwordHasherPort,
                                                     PasswordResetConfigPort configPort,
                                                     NotificationPort notificationPort,
                                                     TokenHasherPort tokenHasherPort,
                                                     OtpGeneratorPort otpGeneratorPort,
                                                     PasswordChangePort passwordChangePort) {
        return new PasswordResetService(userReadPort, tokenPort, passwordHasherPort,
                configPort, notificationPort, tokenHasherPort, otpGeneratorPort, passwordChangePort);
    }
}
