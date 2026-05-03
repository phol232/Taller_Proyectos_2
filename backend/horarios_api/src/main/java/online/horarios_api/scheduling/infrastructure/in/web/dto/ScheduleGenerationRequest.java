package online.horarios_api.scheduling.infrastructure.in.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

public record ScheduleGenerationRequest(
        @NotNull
        @Schema(description = "ID del período académico para generar una opción")
        UUID academicPeriodId,

        @NotEmpty
        @Schema(description = "Aulas habilitadas para esta generación")
        List<UUID> classroomIds,

        @Min(1000)
        @Max(600000)
        @Schema(description = "Tiempo máximo del solver en milisegundos", nullable = true)
        Integer timeLimitMs
) {}
