package online.horarios_api.academicperiod.infrastructure.in.web.dto;

import online.horarios_api.academicperiod.domain.model.AcademicPeriod;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AcademicPeriodResponse(
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
) {

    public static AcademicPeriodResponse from(AcademicPeriod period) {
        return new AcademicPeriodResponse(
                period.id(),
                period.code(),
                period.name(),
                period.startsAt(),
                period.endsAt(),
                period.status(),
                period.maxStudentCredits(),
                period.isActive(),
                period.createdAt(),
                period.updatedAt()
        );
    }
}
