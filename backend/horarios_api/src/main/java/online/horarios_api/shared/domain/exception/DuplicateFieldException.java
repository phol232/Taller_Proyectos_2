package online.horarios_api.shared.domain.exception;

public class DuplicateFieldException extends DomainException {

    private final String field;

    public DuplicateFieldException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
