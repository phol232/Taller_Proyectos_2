package online.horarios_api.passwordreset.domain.port.in;

public interface RequestOtpUseCase {

    String requestOtp(String email);
}
