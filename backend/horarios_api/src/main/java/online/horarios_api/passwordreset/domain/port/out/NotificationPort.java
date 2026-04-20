package online.horarios_api.passwordreset.domain.port.out;

public interface NotificationPort {

    void sendPasswordResetOtp(String toEmail, String fullName, String otp);
}
