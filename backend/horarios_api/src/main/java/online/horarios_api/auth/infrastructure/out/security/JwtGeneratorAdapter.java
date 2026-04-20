package online.horarios_api.auth.infrastructure.out.security;

import online.horarios_api.auth.domain.port.out.JwtGeneratorPort;
import online.horarios_api.shared.domain.model.UserInfo;
import online.horarios_api.shared.infrastructure.config.JwtProperties;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;


@Component
public class JwtGeneratorAdapter implements JwtGeneratorPort {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    public JwtGeneratorAdapter(JwtEncoder jwtEncoder, JwtProperties jwtProperties) {
        this.jwtEncoder = jwtEncoder;
        this.jwtProperties = jwtProperties;
    }

    @Override
    public String generateAccessToken(UserInfo user) {
        Instant now = Instant.now();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("horarios-api")
                .audience(List.of("horarios-api"))
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("role", user.role())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(jwtProperties.accessTokenExpirationSeconds()))
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
