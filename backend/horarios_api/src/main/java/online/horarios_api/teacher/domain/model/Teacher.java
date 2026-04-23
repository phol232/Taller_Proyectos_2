package online.horarios_api.teacher.domain.model;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Teacher(
        UUID id,
        UUID userId,
        String code,
        String fullName,
        String specialty,
        boolean isActive,
        List<AvailabilitySlot> availability,
        Instant createdAt,
        Instant updatedAt
) {}
