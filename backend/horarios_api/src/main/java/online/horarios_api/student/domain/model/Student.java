package online.horarios_api.student.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Student(
        UUID id,
        UUID userId,
        String code,
        String fullName,
        int cycle,
        String career,
        int creditLimit,
        boolean isActive,
        UUID facultadId,
        UUID carreraId,
        String email,
        List<String> approvedCourses,
        Instant createdAt,
        Instant updatedAt
) {}
