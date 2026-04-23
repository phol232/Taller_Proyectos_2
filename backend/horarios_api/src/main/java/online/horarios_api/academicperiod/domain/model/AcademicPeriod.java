package online.horarios_api.academicperiod.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AcademicPeriod(
        UUID id,
        String code,
        String name,
        LocalDate startsAt,
        LocalDate endsAt,
        String status,
        int maxStudentCredits,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}
