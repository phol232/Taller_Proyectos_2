package online.horarios_api.shared.infrastructure.web.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

public record ApiError(

    String  code,
    String  message,

    @JsonInclude(JsonInclude.Include.NON_NULL)
    Map<String, String> errors,

    Instant timestamp
) {
    public ApiError(String code, String message) {
        this(code, message, null, Instant.now());
    }

    public ApiError(String code, String message, Map<String, String> errors) {
        this(code, message, errors, Instant.now());
    }
}
