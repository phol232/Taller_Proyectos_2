package online.horarios_api.shared.infrastructure.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(

    @NotBlank
    @Size(min = 44, message = "El secret JWT debe tener al menos 44 caracteres (256 bits en Base64)")
    String secret,

    @Positive
    long accessTokenExpirationSeconds,

    @Positive
    long refreshTokenExpirationSeconds
) {}
