package online.horarios_api.scheduling.domain.model;

import java.time.LocalTime;
import java.util.UUID;

public record SlotInput(
        UUID classroomId,
        UUID timeSlotId,
        LocalTime startTime,
        LocalTime endTime
) {}
