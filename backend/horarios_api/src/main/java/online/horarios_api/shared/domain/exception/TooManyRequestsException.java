package online.horarios_api.shared.domain.exception;

public class TooManyRequestsException extends DomainException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
