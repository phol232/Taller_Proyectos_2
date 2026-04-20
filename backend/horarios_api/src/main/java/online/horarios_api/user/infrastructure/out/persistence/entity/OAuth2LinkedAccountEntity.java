package online.horarios_api.user.infrastructure.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import online.horarios_api.user.domain.model.OAuth2LinkedAccount;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "oauth2_linked_accounts",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_oauth2_provider_subject",
        columnNames = {"provider", "provider_subject"}
    )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuth2LinkedAccountEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 255)
    private String providerSubject;

    @Column(name = "provider_email", length = 255)
    private String providerEmail;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public OAuth2LinkedAccount toDomain() {
        return new OAuth2LinkedAccount(id, userId, provider, providerSubject, providerEmail, createdAt);
    }

    public static OAuth2LinkedAccountEntity fromDomain(OAuth2LinkedAccount account) {
        return OAuth2LinkedAccountEntity.builder()
                .id(account.getId())
                .userId(account.getUserId())
                .provider(account.getProvider())
                .providerSubject(account.getProviderSubject())
                .providerEmail(account.getProviderEmail())
                .createdAt(account.getCreatedAt())
                .build();
    }
}
