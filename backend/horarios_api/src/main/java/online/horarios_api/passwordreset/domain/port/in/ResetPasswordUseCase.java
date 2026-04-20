package online.horarios_api.passwordreset.domain.port.in;

public interface ResetPasswordUseCase {

    void resetPassword(String rawResetToken, String newPassword);
}
