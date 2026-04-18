package online.horarios_api.profile.dto;

import online.horarios_api.profile.entity.SexType;

import java.time.Instant;
import java.util.UUID;

public record ProfileResponse(
    UUID    id,
    UUID    userId,
    String  fullName,
    String  email,
    String  role,
    String  dni,
    String  phone,
    SexType sex,
    Integer age,
    Instant createdAt,
    Instant updatedAt
) {}
