package online.horarios_api.profile.domain.exception;

import online.horarios_api.shared.domain.exception.DuplicateFieldException;

public class DuplicateProfileFieldException extends DuplicateFieldException {

    public DuplicateProfileFieldException(String field, String message) {
        super(field, message);
    }
}
