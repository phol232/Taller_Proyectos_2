package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StudentBuilderDraftResponse(
        UUID scheduleId,
        int optionIndex,
        String status,
        String draftSource,
        int creditLimit,
        int totalCredits,
        Instant expiresAt,
        int secondsRemaining,
        int liveDraftCount,
        List<CourseItemResponse> items
) {
    public record CourseItemResponse(
            UUID itemId,
            UUID courseId,
            String courseCode,
            String courseName,
            int courseCredits,
            UUID sectionId,
            String nrc,
            Integer sectionNumber,
            List<ComponentResponse> components
    ) {
        public static CourseItemResponse from(StudentBuilderDraft.StudentBuilderCourseItem item) {
            return new CourseItemResponse(
                    item.itemId(),
                    item.courseId(),
                    item.courseCode(),
                    item.courseName(),
                    item.courseCredits(),
                    item.sectionId(),
                    item.nrc(),
                    item.sectionNumber(),
                    item.components().stream().map(ComponentResponse::from).toList()
            );
        }
    }

    public record ComponentResponse(
            UUID courseComponentId,
            UUID courseAssignmentId,
            String componentType
    ) {
        public static ComponentResponse from(StudentBuilderDraft.StudentBuilderComponent c) {
            return new ComponentResponse(c.courseComponentId(), c.courseAssignmentId(), c.componentType());
        }
    }

    public static StudentBuilderDraftResponse from(StudentBuilderDraft draft) {
        return new StudentBuilderDraftResponse(
                draft.scheduleId(),
                draft.optionIndex(),
                draft.status(),
                draft.draftSource(),
                draft.creditLimit(),
                draft.totalCredits(),
                draft.expiresAt(),
                draft.secondsRemaining(),
                draft.liveDraftCount(),
                draft.items().stream().map(CourseItemResponse::from).toList()
        );
    }
}
