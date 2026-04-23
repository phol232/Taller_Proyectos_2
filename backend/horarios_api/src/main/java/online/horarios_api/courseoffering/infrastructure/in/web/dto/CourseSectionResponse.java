package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import online.horarios_api.courseoffering.domain.model.CourseSection;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseSectionResponse(
        UUID id,
        String sectionCode,
        int vacancyLimit,
        String status,
        List<SectionTeacherCandidateResponse> teacherCandidates,
        Instant createdAt,
        Instant updatedAt
) {
    public static CourseSectionResponse from(CourseSection section) {
        return new CourseSectionResponse(
                section.id(),
                section.sectionCode(),
                section.vacancyLimit(),
                section.status(),
                section.teacherCandidates().stream().map(SectionTeacherCandidateResponse::from).toList(),
                section.createdAt(),
                section.updatedAt()
        );
    }
}
