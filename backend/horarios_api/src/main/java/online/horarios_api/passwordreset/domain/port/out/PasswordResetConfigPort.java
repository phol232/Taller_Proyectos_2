package online.horarios_api.passwordreset.domain.port.out;

public interface PasswordResetConfigPort {

    int getOtpExpiryMinutes();

    int getMaxRequestsPerWindow();

    int getRateLimitWindowMinutes();

    int getMaxVerifyAttempts();
}
