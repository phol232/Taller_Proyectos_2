package online.horarios_api.scheduling.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StudentBuilderDraft(
        UUID scheduleId,
        int optionIndex,
        String status,
        String draftSource,
        int creditLimit,
        int totalCredits,
        Instant expiresAt,
        int secondsRemaining,
        int liveDraftCount,
        List<StudentBuilderCourseItem> items
) {
    public record StudentBuilderCourseItem(
            UUID itemId,
            UUID courseId,
            String courseCode,
            String courseName,
            int courseCredits,
            UUID sectionId,
            String nrc,
            Integer sectionNumber,
            List<StudentBuilderComponent> components
    ) {}

    public record StudentBuilderComponent(
            UUID courseComponentId,
            UUID courseAssignmentId,
            String componentType
    ) {}
}
