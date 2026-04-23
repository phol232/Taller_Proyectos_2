package online.horarios_api.shared.domain.model;

import java.time.LocalTime;

public record AvailabilitySlot(
        ScheduleDay day,
        LocalTime startTime,
        LocalTime endTime,
        boolean available
) {}
