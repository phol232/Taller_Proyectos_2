package online.horarios_api.auth.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoginRequest — validaciones Bean Validation")
class LoginRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private Set<ConstraintViolation<LoginRequest>> validate(String email, String password) {
        return validator.validate(new LoginRequest(email, password));
    }


    @Test
    @DisplayName("email nulo → violación NotBlank")
    void email_null_fails() {
        var violations = validate(null, "Password1!");
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @Test
    @DisplayName("email vacío → violación NotBlank")
    void email_blank_fails() {
        var violations = validate("", "Password1!");
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"noatsign", "user@gmail.com", "user@university.edu", "user@continental.edu"})
    @DisplayName("email fuera del dominio → violación Pattern")
    void email_wrong_domain_fails(String email) {
        var violations = validate(email, "Password1!");
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"user@continental.edu.pe", "72890842@continental.edu.pe", "a.b.c@continental.edu.pe"})
    @DisplayName("email con dominio institucional → válido")
    void email_institutional_domain_passes(String email) {
        var violations = validate(email, "Password1!");
        assertThat(violations).noneMatch(v -> v.getPropertyPath().toString().equals("email"));
    }


    @Test
    @DisplayName("password nulo → violación NotBlank")
    void password_null_fails() {
        var violations = validate("user@continental.edu.pe", null);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    @Test
    @DisplayName("password menor a 8 caracteres → violación Size")
    void password_too_short_fails() {
        var violations = validate("user@continental.edu.pe", "short");
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    @Test
    @DisplayName("password mayor a 100 caracteres → violación Size")
    void password_too_long_fails() {
        var violations = validate("user@continental.edu.pe", "a".repeat(101));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    @Test
    @DisplayName("credenciales válidas → sin violaciones")
    void valid_request_passes() {
        var violations = validate("user@continental.edu.pe", "ValidPass1!");
        assertThat(violations).isEmpty();
    }
}
