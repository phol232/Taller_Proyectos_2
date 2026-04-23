package online.horarios_api.courseoffering.domain.model;

import java.util.List;

public record CourseSectionData(
        String sectionCode,
        int vacancyLimit,
        String status,
        List<SectionTeacherCandidate> teacherCandidates
) {}
