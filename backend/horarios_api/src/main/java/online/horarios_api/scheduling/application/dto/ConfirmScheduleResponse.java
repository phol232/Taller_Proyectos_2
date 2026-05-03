package online.horarios_api.scheduling.application.dto;

import java.util.UUID;

public record ConfirmScheduleResponse(
        UUID scheduleId,
        String status
) {}
