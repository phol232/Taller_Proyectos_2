package online.horarios_api.classroom.infrastructure.in.web.dto;

import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.shared.infrastructure.in.web.dto.AvailabilitySlotResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ClassroomResponse(
        UUID id,
        String code,
        String name,
        int capacity,
        String type,
        boolean isActive,
        List<AvailabilitySlotResponse> availability,
        Instant createdAt,
        Instant updatedAt
) {

    public static ClassroomResponse from(Classroom classroom) {
        return new ClassroomResponse(
                classroom.id(),
                classroom.code(),
                classroom.name(),
                classroom.capacity(),
                classroom.type(),
                classroom.isActive(),
                classroom.availability().stream().map(AvailabilitySlotResponse::from).toList(),
                classroom.createdAt(),
                classroom.updatedAt()
        );
    }
}
