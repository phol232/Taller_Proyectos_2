package online.horarios_api.scheduling.infrastructure.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record AddCourseAssignmentRequest(
        @NotNull UUID courseComponentId,
        @NotNull UUID teacherId,
        UUID sectionId,
        @Valid List<SlotInputRequest> slots
) {}
