package online.horarios_api.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(

    FrontendProperties frontend,
    SecurityProperties security,
    CorsProperties cors

) {
    public record FrontendProperties(
        @NotBlank String url
    ) {}

    public record SecurityProperties(
        CookieProperties cookie
    ) {
        public record CookieProperties(
            boolean secure
        ) {}
    }

    public record CorsProperties(
        @NotEmpty List<String> allowedOrigins
    ) {}
}
