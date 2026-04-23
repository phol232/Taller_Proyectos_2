package online.horarios_api.classroom.domain.model;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

import java.util.List;

public record ClassroomData(
        String code,
        String name,
        int capacity,
        String type,
        Boolean isActive,
        List<AvailabilitySlot> availability
) {}
