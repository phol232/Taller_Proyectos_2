package online.horarios_api.profile.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;
@Getter
@AllArgsConstructor
public class Profile {

    private UUID id;
    private UUID userId;
    private String dni;
    private String phone;
    private SexType sex;
    private Short age;
    private UUID facultadId;
    private UUID carreraId;
    private Instant createdAt;
    private Instant updatedAt;

    public static Profile createForUser(UUID userId) {
        return new Profile(null, userId, null, null, null, null, null, null, null, null);
    }

    public void updateData(ProfileData data) {
        this.dni = normalizeBlank(data.dni());
        this.phone = normalizeBlank(data.phone());
        this.sex = data.sex();
        this.age = data.age() != null ? data.age().shortValue() : null;
        this.facultadId = data.facultadId();
        this.carreraId = data.carreraId();
    }

    private String normalizeBlank(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
