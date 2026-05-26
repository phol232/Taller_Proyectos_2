package online.horarios_api.scheduling.domain.model;

import java.time.LocalTime;
import java.util.UUID;

public record TimeSlot(
        UUID id,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        int slotOrder
) {}
