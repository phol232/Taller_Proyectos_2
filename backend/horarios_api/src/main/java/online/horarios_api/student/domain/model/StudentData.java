package online.horarios_api.student.domain.model;

import java.util.List;
import java.util.UUID;

public record StudentData(
        UUID userId,
        String code,
        String fullName,
        int cycle,
        String career,
        Integer creditLimit,
        Boolean isActive,
        UUID facultadId,
        UUID carreraId,
        List<String> approvedCourses
) {}
