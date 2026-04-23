package online.horarios_api.courseoffering.domain.model;

import java.util.UUID;

public record SectionTeacherCandidate(
        UUID teacherId,
        double priorityWeight
) {}
