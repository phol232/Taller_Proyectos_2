package online.horarios_api.shared.infrastructure.in.web.dto;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

public record AvailabilitySlotResponse(
        String day,
        String startTime,
        String endTime,
        boolean available
) {

    public static AvailabilitySlotResponse from(AvailabilitySlot slot) {
        return new AvailabilitySlotResponse(
                slot.day().name(),
                slot.startTime().toString(),
                slot.endTime().toString(),
                slot.available()
        );
    }
}
