package online.horarios_api.passwordreset.infrastructure.out.config;

import lombok.RequiredArgsConstructor;
import online.horarios_api.passwordreset.domain.port.out.PasswordResetConfigPort;
import online.horarios_api.passwordreset.infrastructure.config.PasswordResetProperties;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordResetConfigAdapter implements PasswordResetConfigPort {

    private final PasswordResetProperties properties;

    @Override
    public int getOtpExpiryMinutes() {
        return properties.otpExpiryMinutes();
    }

    @Override
    public int getMaxRequestsPerWindow() {
        return properties.maxRequestsPerWindow();
    }

    @Override
    public int getRateLimitWindowMinutes() {
        return properties.rateLimitWindowMinutes();
    }

    @Override
    public int getMaxVerifyAttempts() {
        return properties.maxVerifyAttempts();
    }
}
