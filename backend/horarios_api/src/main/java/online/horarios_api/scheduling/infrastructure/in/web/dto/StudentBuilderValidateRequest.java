package online.horarios_api.scheduling.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record StudentBuilderValidateRequest(
        @NotNull UUID scheduleId,
        @NotNull UUID courseId,
        @NotEmpty List<UUID> assignmentIds
) {}
