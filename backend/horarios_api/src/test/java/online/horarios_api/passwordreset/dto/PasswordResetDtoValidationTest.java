package online.horarios_api.passwordreset.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DTOs Password Reset — validaciones Bean Validation")
class PasswordResetDtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("ForgotPasswordRequest: email nulo → falla")
    void forgotRequest_null_email_fails() {
        var violations = validator.validate(new ForgotPasswordRequest(null));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"user@gmail.com", "noatsign", "user@continental.edu"})
    @DisplayName("ForgotPasswordRequest: dominio inválido → falla")
    void forgotRequest_wrong_domain_fails(String email) {
        var violations = validator.validate(new ForgotPasswordRequest(email));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @Test
    @DisplayName("ForgotPasswordRequest: dominio institucional → válido")
    void forgotRequest_valid_email_passes() {
        var violations = validator.validate(new ForgotPasswordRequest("user@continental.edu.pe"));
        assertThat(violations).isEmpty();
    }


    @Test
    @DisplayName("VerifyOtpRequest: OTP nulo → falla")
    void verifyRequest_null_otp_fails() {
        var violations = validator.validate(new VerifyOtpRequest("user@continental.edu.pe", null));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("otp"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345", "1234567", "abcdef", "12 345"})
    @DisplayName("VerifyOtpRequest: OTP con formato inválido → falla")
    void verifyRequest_invalid_otp_format_fails(String otp) {
        var violations = validator.validate(new VerifyOtpRequest("user@continental.edu.pe", otp));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("otp"));
    }

    @Test
    @DisplayName("VerifyOtpRequest: OTP de 6 dígitos → válido")
    void verifyRequest_valid_otp_passes() {
        var violations = validator.validate(new VerifyOtpRequest("user@continental.edu.pe", "123456"));
        assertThat(violations).isEmpty();
    }


    @Test
    @DisplayName("ResetPasswordRequest: token nulo → falla")
    void resetRequest_null_token_fails() {
        var violations = validator.validate(new ResetPasswordRequest(null, "NewPass1!"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("resetToken"));
    }

    @Test
    @DisplayName("ResetPasswordRequest: contraseña menor a 8 chars → falla")
    void resetRequest_short_password_fails() {
        var violations = validator.validate(new ResetPasswordRequest("token", "short"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("newPassword"));
    }

    @Test
    @DisplayName("ResetPasswordRequest: datos válidos → sin violaciones")
    void resetRequest_valid_passes() {
        var violations = validator.validate(new ResetPasswordRequest("some-uuid-token", "NewSecurePass1!"));
        assertThat(violations).isEmpty();
    }
}
