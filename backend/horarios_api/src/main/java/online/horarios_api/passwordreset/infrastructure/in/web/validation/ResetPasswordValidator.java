package online.horarios_api.passwordreset.infrastructure.in.web.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.ArrayList;
import java.util.List;

public class ResetPasswordValidator implements ConstraintValidator<ValidResetPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank() || value.length() < 8) {
            return true;
        }

        if (containsUnsupportedCharacters(value)) {
            return buildViolation(context,
                    "La contraseña no puede contener espacios ni caracteres no visibles");
        }

        List<String> missingRules = new ArrayList<>();

        if (value.codePoints().noneMatch(Character::isUpperCase)) {
            missingRules.add("una mayúscula");
        }
        if (value.codePoints().noneMatch(Character::isLowerCase)) {
            missingRules.add("una minúscula");
        }
        if (value.codePoints().noneMatch(Character::isDigit)) {
            missingRules.add("un número");
        }
        if (value.codePoints().noneMatch(this::isSpecialCharacter)) {
            missingRules.add("un carácter especial");
        }

        if (missingRules.isEmpty()) {
            return true;
        }

        String message = missingRules.size() == 1
                ? "La contraseña debe incluir " + missingRules.get(0)
                : "La contraseña debe incluir: " + String.join(", ", missingRules);

        return buildViolation(context, message);
    }

    private boolean buildViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        return false;
    }

    private boolean containsUnsupportedCharacters(String value) {
        return value.codePoints().anyMatch(character -> Character.isWhitespace(character)
                || Character.isISOControl(character));
    }

    private boolean isSpecialCharacter(int character) {
        return !Character.isLetterOrDigit(character)
                && !Character.isWhitespace(character)
                && !Character.isISOControl(character);
    }
}