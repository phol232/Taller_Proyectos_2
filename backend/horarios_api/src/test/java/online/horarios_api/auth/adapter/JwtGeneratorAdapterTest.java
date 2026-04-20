package online.horarios_api.auth.adapter;

import online.horarios_api.auth.infrastructure.out.security.JwtGeneratorAdapter;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.*;

import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtGeneratorAdapter — tests unitarios")
class JwtGeneratorAdapterTest {

    private JwtGeneratorAdapter adapter;
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        // 256-bit key encoded as Base64 (44 chars)
        String secret = Base64.getEncoder().encodeToString(new byte[32]);
        JwtProperties properties = new JwtProperties(secret, 3600, 86400);

        SecretKeySpec key = new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(
                new com.nimbusds.jose.jwk.source.ImmutableSecret<>(key));
        jwtDecoder = NimbusJwtDecoder.withSecretKey(key).build();

        adapter = new JwtGeneratorAdapter(encoder, properties);
    }

    @Test
    @DisplayName("generateAccessToken produce un JWT válido con claims correctos")
    void generateAccessToken_producesValidJwt() {
        UUID userId = UUID.randomUUID();
        String email = "test@continental.edu.pe";
        UserInfo user = new UserInfo(userId, email, "Test", "STUDENT", null);

        String token = adapter.generateAccessToken(user);

        assertThat(token).isNotBlank();
        Jwt decoded = jwtDecoder.decode(token);
        assertThat(decoded.getSubject()).isEqualTo(userId.toString());
        assertThat(decoded.<String>getClaim("email")).isEqualTo(email);
        assertThat(decoded.<String>getClaim("role")).isEqualTo("STUDENT");
        assertThat(decoded.getClaimAsString("iss")).isEqualTo("horarios-api");
    }
}
