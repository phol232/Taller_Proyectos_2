package online.horarios_api.student.infrastructure.in.web.dto;

import online.horarios_api.student.domain.model.Student;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StudentResponse(
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
) {

    public static StudentResponse from(Student student) {
        return new StudentResponse(
                student.id(),
                student.userId(),
                student.code(),
                student.fullName(),
                student.cycle(),
                student.career(),
                student.creditLimit(),
                student.isActive(),
                student.facultadId(),
                student.carreraId(),
                student.email(),
                student.approvedCourses(),
                student.createdAt(),
                student.updatedAt()
        );
    }
}
