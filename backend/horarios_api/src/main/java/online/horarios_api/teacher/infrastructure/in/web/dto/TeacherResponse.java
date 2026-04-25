package online.horarios_api.teacher.infrastructure.in.web.dto;

import online.horarios_api.shared.infrastructure.in.web.dto.AvailabilitySlotResponse;
import online.horarios_api.teacher.domain.model.Teacher;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeacherResponse(
        UUID id,
        UUID userId,
        String code,
        String fullName,
        String email,
        String specialty,
        boolean isActive,
        List<AvailabilitySlotResponse> availability,
        List<String> courseCodes,
        Instant createdAt,
        Instant updatedAt
) {

    public static TeacherResponse from(Teacher teacher) {
        return new TeacherResponse(
                teacher.id(),
                teacher.userId(),
                teacher.code(),
                teacher.fullName(),
                teacher.email(),
                teacher.specialty(),
                teacher.isActive(),
                teacher.availability().stream().map(AvailabilitySlotResponse::from).toList(),
                teacher.courseCodes(),
                teacher.createdAt(),
                teacher.updatedAt()
        );
    }
}
