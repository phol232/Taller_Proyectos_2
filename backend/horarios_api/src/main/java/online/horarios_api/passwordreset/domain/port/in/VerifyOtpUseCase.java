package online.horarios_api.passwordreset.domain.port.in;

import online.horarios_api.passwordreset.domain.model.OtpVerificationResult;

public interface VerifyOtpUseCase {

    OtpVerificationResult verifyOtp(String email, String otp);
}
