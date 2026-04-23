package online.horarios_api.profile.domain.model;

import java.time.Instant;
import java.util.UUID;

public record ProfileInfo(
    UUID    id,
    UUID    userId,
    String  fullName,
    String  email,
    String  role,
    String  dni,
    String  phone,
    SexType sex,
    Integer age,
    UUID    facultadId,
    UUID    carreraId,
    Instant createdAt,
    Instant updatedAt
) {}
