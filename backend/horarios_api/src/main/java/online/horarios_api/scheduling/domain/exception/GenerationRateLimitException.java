package online.horarios_api.scheduling.domain.exception;

import online.horarios_api.shared.domain.exception.TooManyRequestsException;

public class GenerationRateLimitException extends TooManyRequestsException {

    private final int retryAfterSeconds;
    private final int remaining;

    public GenerationRateLimitException(String message, int retryAfterSeconds, int remaining) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
        this.remaining = remaining;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public int getRemaining() {
        return remaining;
    }
}
