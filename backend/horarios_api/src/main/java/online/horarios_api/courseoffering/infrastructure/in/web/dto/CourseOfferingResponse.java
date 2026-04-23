package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import online.horarios_api.courseoffering.domain.model.CourseOffering;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseOfferingResponse(
        UUID id,
        UUID academicPeriodId,
        UUID courseId,
        int expectedEnrollment,
        String status,
        List<CourseSectionResponse> sections,
        Instant createdAt,
        Instant updatedAt
) {
    public static CourseOfferingResponse from(CourseOffering offering) {
        return new CourseOfferingResponse(
                offering.id(),
                offering.academicPeriodId(),
                offering.courseId(),
                offering.expectedEnrollment(),
                offering.status(),
                offering.sections().stream().map(CourseSectionResponse::from).toList(),
                offering.createdAt(),
                offering.updatedAt()
        );
    }
}
