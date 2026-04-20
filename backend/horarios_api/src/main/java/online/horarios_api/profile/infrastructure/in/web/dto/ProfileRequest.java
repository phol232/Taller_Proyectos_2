package online.horarios_api.profile.infrastructure.in.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import online.horarios_api.profile.domain.model.SexType;

public record ProfileRequest(

    @Pattern(regexp = "^[0-9]{0,8}$",
             message = "El DNI debe contener solo dígitos y máximo 8 caracteres")
    String dni,

    @Pattern(regexp = "^(9[0-9]{8})?$",
             message = "El teléfono peruano debe empezar por 9 y tener exactamente 9 dígitos")
    String phone,

    SexType sex,

    @Min(value = 0,   message = "La edad no puede ser negativa")
    @Max(value = 150, message = "La edad no puede superar 150")
    Integer age
) {}
