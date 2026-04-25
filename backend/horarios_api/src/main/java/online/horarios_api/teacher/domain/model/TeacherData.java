package online.horarios_api.teacher.domain.model;

import online.horarios_api.shared.domain.model.AvailabilitySlot;

import java.util.List;
import java.util.UUID;

public record TeacherData(
        UUID userId,
        String code,
        String fullName,
        String specialty,
        Boolean isActive,
        List<AvailabilitySlot> availability,
        List<String> courseCodes
) {}
