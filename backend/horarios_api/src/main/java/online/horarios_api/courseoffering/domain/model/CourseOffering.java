package online.horarios_api.courseoffering.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseOffering(
        UUID id,
        UUID academicPeriodId,
        UUID courseId,
        int expectedEnrollment,
        String status,
        List<CourseSection> sections,
        Instant createdAt,
        Instant updatedAt
) {}
