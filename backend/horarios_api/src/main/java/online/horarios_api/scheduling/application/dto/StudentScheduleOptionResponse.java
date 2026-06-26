package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.StudentScheduleOption;

import java.time.Instant;
import java.util.UUID;

public record StudentScheduleOptionResponse(
        UUID scheduleId,
        int optionIndex,
        String status,
        Instant createdAt,
        Instant expiresAt,
        int secondsRemaining,
        int itemCount
) {
    public static StudentScheduleOptionResponse from(StudentScheduleOption option) {
        return new StudentScheduleOptionResponse(
                option.scheduleId(),
                option.optionIndex(),
                option.status(),
                option.createdAt(),
                option.expiresAt(),
                option.secondsRemaining(),
                option.itemCount()
        );
    }
}
