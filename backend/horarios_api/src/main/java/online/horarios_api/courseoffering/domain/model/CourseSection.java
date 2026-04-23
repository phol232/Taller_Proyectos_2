package online.horarios_api.courseoffering.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseSection(
        UUID id,
        String sectionCode,
        int vacancyLimit,
        String status,
        List<SectionTeacherCandidate> teacherCandidates,
        Instant createdAt,
        Instant updatedAt
) {}
