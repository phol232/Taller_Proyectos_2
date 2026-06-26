package online.horarios_api.user.validation;

import jakarta.validation.ConstraintValidatorContext;
import online.horarios_api.user.infrastructure.in.web.validation.UserPasswordValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

@DisplayName("UserPasswordValidator — reglas de contraseña")
class UserPasswordValidatorTest {

    private UserPasswordValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new UserPasswordValidator();

        context = mock(ConstraintValidatorContext.class);
        ConstraintValidatorContext.ConstraintViolationBuilder builder =
                mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        lenient().when(context.buildConstraintViolationWithTemplate(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(builder);
        lenient().when(builder.addConstraintViolation()).thenReturn(context);
    }

    @Test
    @DisplayName("null es válido (otra validación se encarga)")
    void nullIsValid() {
        assertThat(validator.isValid(null, context)).isTrue();
    }

    @Test
    @DisplayName("en blanco es válido (no aplica la regla de complejidad)")
    void blankIsValid() {
        assertThat(validator.isValid("   ", context)).isTrue();
    }

    @Test
    @DisplayName("menor a 8 caracteres no aplica la regla de complejidad")
    void shortIsValid() {
        assertThat(validator.isValid("Ab1$", context)).isTrue();
    }

    @Test
    @DisplayName("contraseña completa y fuerte es válida")
    void strongIsValid() {
        assertThat(validator.isValid("Abcdef1$", context)).isTrue();
    }

    @Test
    @DisplayName("rechaza espacios o caracteres no visibles")
    void rejectsWhitespace() {
        assertThat(validator.isValid("Abcdef1 $x", context)).isFalse();
    }

    @Test
    @DisplayName("rechaza por faltar una mayúscula")
    void rejectsMissingUpper() {
        assertThat(validator.isValid("abcdef1$x", context)).isFalse();
    }

    @Test
    @DisplayName("rechaza por faltar una minúscula")
    void rejectsMissingLower() {
        assertThat(validator.isValid("ABCDEF1$X", context)).isFalse();
    }

    @Test
    @DisplayName("rechaza por faltar un número")
    void rejectsMissingDigit() {
        assertThat(validator.isValid("Abcdefg$x", context)).isFalse();
    }

    @Test
    @DisplayName("rechaza por faltar un carácter especial")
    void rejectsMissingSpecial() {
        assertThat(validator.isValid("Abcdefg1x", context)).isFalse();
    }

    @Test
    @DisplayName("acumula múltiples reglas faltantes (mensaje con lista)")
    void rejectsMultipleMissing() {
        // Sin mayúscula ni carácter especial
        assertThat(validator.isValid("abcdefg1x", context)).isFalse();
    }
}
