package online.horarios_api.profile.domain.model;

public record ProfileData(
    String  dni,
    String  phone,
    SexType sex,
    Integer age
) {}
