package online.horarios_api.shared.integration;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Genera JWTs firmados con la clave de prueba para usarlos en MockMvc
 * como cookie {@code access_token} (igual que haría el backend en producción).
 */
public class JwtTestHelper {

    // "test_secret_for_test_integration" (32 bytes) en Base64
    static final String TEST_SECRET = "dGVzdF9zZWNyZXRfZm9yX3Rlc3RfaW50ZWdyYXRpb24=";

    private final NimbusJwtEncoder encoder;

    public JwtTestHelper() {
        byte[] keyBytes = Base64.getDecoder().decode(TEST_SECRET);
        OctetSequenceKey jwk = new OctetSequenceKey.Builder(keyBytes)
                .algorithm(JWSAlgorithm.HS256)
                .build();
        this.encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }

    /**
     * Genera un token válido con el rol indicado (ej: "ADMIN", "STUDENT", "TEACHER", "COORDINATOR").
     */
    public String generateToken(UUID userId, String role) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("horarios-api")
                .audience(List.of("horarios-api"))
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .claim("role", role)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
