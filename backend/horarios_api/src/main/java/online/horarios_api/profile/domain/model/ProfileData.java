package online.horarios_api.profile.domain.model;

import java.util.UUID;

public record ProfileData(
    String  dni,
    String  phone,
    SexType sex,
    Integer age,
    UUID    facultadId,
    UUID    carreraId
) {}
