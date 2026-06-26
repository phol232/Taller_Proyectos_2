package online.horarios_api.scheduling.domain.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StudentPendingCourse(
        UUID courseId,
        String courseCode,
        String courseName,
        int courseCycle,
        int courseCredits,
        BigDecimal courseWeeklyHours,
        int requiredComponents,
        List<CoursePrerequisite> prerequisites,
        List<PendingCourseSection> sections
) {
    public record CoursePrerequisite(
            UUID prerequisiteCourseId,
            String prerequisiteCode,
            boolean satisfied
    ) {}

    public record PendingCourseSection(
            UUID sectionId,
            String nrc,
            Integer sectionNumber,
            Integer availableVacancies,
            List<PendingCourseSectionComponent> components
    ) {}

    public record PendingCourseSectionComponent(
            UUID assignmentId,
            UUID courseComponentId,
            String componentType,
            BigDecimal componentWeeklyHours,
            UUID teacherId,
            String teacherCode,
            String teacherName,
            List<ScheduleAssignmentSlot> slots
    ) {}
}
