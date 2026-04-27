package online.horarios_api.classroom.domain.model;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

import java.util.List;
import java.util.UUID;

public record ClassroomData(
        String code,
        String name,
        int capacity,
        String type,
        Boolean isActive,
        List<AvailabilitySlot> availability,
        List<String> courseCodes,
        List<UUID> courseComponentIds
) {}
