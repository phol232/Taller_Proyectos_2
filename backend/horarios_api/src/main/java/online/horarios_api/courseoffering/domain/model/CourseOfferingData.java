package online.horarios_api.courseoffering.domain.model;

import java.util.List;
import java.util.UUID;

public record CourseOfferingData(
        UUID academicPeriodId,
        UUID courseId,
        int expectedEnrollment,
        String status,
        List<CourseSectionData> sections
) {}
