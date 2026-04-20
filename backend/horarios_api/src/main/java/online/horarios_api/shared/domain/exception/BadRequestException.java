package online.horarios_api.shared.domain.exception;

public class BadRequestException extends DomainException {

    public BadRequestException(String message) {
        super(message);
    }
}
