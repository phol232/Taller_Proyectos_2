package online.horarios_api.shared.infrastructure.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;

import java.time.LocalTime;

public record AvailabilitySlotRequest(
        @NotNull(message = "El día es obligatorio")
        ScheduleDay day,

        @NotBlank(message = "La hora de inicio es obligatoria")
        String startTime,

        @NotBlank(message = "La hora de fin es obligatoria")
        String endTime,

        Boolean available
) {

    public AvailabilitySlot toDomain() {
        return new AvailabilitySlot(
                day,
                LocalTime.parse(startTime.trim()),
                LocalTime.parse(endTime.trim()),
                available == null || available
        );
    }
}
