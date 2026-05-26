package online.horarios_api.scheduling.application.dto;

import java.util.UUID;

public record TimeSlotResponse(
        UUID id,
        String dayOfWeek,
        String startTime,
        String endTime,
        int slotOrder
) {}
