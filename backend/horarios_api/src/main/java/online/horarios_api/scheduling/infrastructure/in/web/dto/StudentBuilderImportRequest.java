package online.horarios_api.scheduling.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StudentBuilderImportRequest(
        @NotNull UUID sourceScheduleId
) {}
