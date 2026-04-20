package online.horarios_api.user.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class OAuth2LinkedAccount {

    private UUID id;
    private UUID userId;
    private String provider;
    private String providerSubject;
    private String providerEmail;
    private Instant createdAt;

    public static OAuth2LinkedAccount create(UUID userId, String provider,
                                             String providerSubject, String providerEmail) {
        return new OAuth2LinkedAccount(null, userId, provider, providerSubject, providerEmail, null);
    }
}
