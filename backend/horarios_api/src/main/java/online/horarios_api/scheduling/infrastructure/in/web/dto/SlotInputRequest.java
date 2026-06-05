package online.horarios_api.scheduling.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.UUID;

public record SlotInputRequest(
        @NotNull UUID classroomId,
        @NotNull UUID timeSlotId,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime
) {}
