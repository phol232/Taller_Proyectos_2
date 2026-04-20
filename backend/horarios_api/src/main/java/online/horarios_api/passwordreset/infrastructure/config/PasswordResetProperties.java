package online.horarios_api.passwordreset.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.password-reset")
public record PasswordResetProperties(
        int otpExpiryMinutes,
        int maxRequestsPerWindow,
        int rateLimitWindowMinutes,
        int maxVerifyAttempts,
        String fromEmail,
        String fromName
) {}
