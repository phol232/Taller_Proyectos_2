package online.horarios_api.classroom.domain.model;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Classroom(
        UUID id,
        String code,
        String name,
        int capacity,
        String type,
        boolean isActive,
        List<AvailabilitySlot> availability,
        List<String> courseCodes,
        List<UUID> courseComponentIds,
        Instant createdAt,
        Instant updatedAt
) {}
