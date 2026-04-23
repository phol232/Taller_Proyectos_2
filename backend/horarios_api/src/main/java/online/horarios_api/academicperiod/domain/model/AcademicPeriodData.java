package online.horarios_api.academicperiod.domain.model;

import java.time.LocalDate;

public record AcademicPeriodData(
        String code,
        String name,
        LocalDate startsAt,
        LocalDate endsAt,
        String status,
        Integer maxStudentCredits
) {}
