package online.horarios_api.profile.infrastructure.out.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import online.horarios_api.profile.domain.model.Profile;
import online.horarios_api.profile.domain.model.SexType;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(length = 20, unique = true)
    private String dni;

    @Column(length = 20, unique = true)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "sex_type")
    @ColumnTransformer(write = "?::sex_type")
    private SexType sex;

    @Column(columnDefinition = "smallint")
    private Short age;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ── Mappers ───────────────────────────────────────────────────────

    public Profile toDomain() {
        return new Profile(id, userId, dni, phone, sex, age, createdAt, updatedAt);
    }

    public static ProfileEntity fromDomain(Profile profile) {
        return ProfileEntity.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .dni(profile.getDni())
                .phone(profile.getPhone())
                .sex(profile.getSex())
                .age(profile.getAge())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
