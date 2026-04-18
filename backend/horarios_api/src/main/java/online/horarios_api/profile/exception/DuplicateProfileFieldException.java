package online.horarios_api.profile.exception;

public class DuplicateProfileFieldException extends RuntimeException {

    private final String field;

    public DuplicateProfileFieldException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
