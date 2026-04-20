package online.horarios_api.passwordreset.infrastructure.out.security;

import online.horarios_api.passwordreset.domain.port.out.OtpGeneratorPort;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class OtpGeneratorAdapter implements OtpGeneratorPort {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public String generateOtp() {
        return String.valueOf(SECURE_RANDOM.nextInt(900_000) + 100_000);
    }
}
