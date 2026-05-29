package online.horarios_api.scheduling.application.dto;

import online.horarios_api.scheduling.domain.model.ScheduleAssignmentSlot;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StudentPendingCourseResponse(
        UUID courseId,
        String courseCode,
        String courseName,
        int courseCycle,
        int courseCredits,
        BigDecimal courseWeeklyHours,
        int requiredComponents,
        List<SectionResponse> sections
) {
    public record SectionResponse(
            UUID sectionId,
            String nrc,
            Integer sectionNumber,
            List<ComponentResponse> components
    ) {
        public static SectionResponse from(StudentPendingCourse.PendingCourseSection s) {
            return new SectionResponse(
                    s.sectionId(), s.nrc(), s.sectionNumber(),
                    s.components().stream().map(ComponentResponse::from).toList()
            );
        }
    }

    public record ComponentResponse(
            UUID assignmentId,
            UUID courseComponentId,
            String componentType,
            BigDecimal componentWeeklyHours,
            UUID teacherId,
            String teacherCode,
            String teacherName,
            List<SlotResponse> slots
    ) {
        public static ComponentResponse from(StudentPendingCourse.PendingCourseSectionComponent c) {
            return new ComponentResponse(
                    c.assignmentId(), c.courseComponentId(), c.componentType(),
                    c.componentWeeklyHours(),
                    c.teacherId(), c.teacherCode(), c.teacherName(),
                    c.slots().stream().map(SlotResponse::from).toList()
            );
        }
    }

    public record SlotResponse(
            UUID slotId,
            UUID timeSlotId,
            String dayOfWeek,
            String startTime,
            String endTime,
            UUID classroomId,
            String classroomCode,
            String classroomName
    ) {
        public static SlotResponse from(ScheduleAssignmentSlot s) {
            return new SlotResponse(
                    s.slotId(), s.timeSlotId(), s.dayOfWeek(),
                    s.startTime(), s.endTime(),
                    s.classroomId(), s.classroomCode(), s.classroomName()
            );
        }
    }

    public static StudentPendingCourseResponse from(StudentPendingCourse c) {
        return new StudentPendingCourseResponse(
                c.courseId(), c.courseCode(), c.courseName(),
                c.courseCycle(), c.courseCredits(), c.courseWeeklyHours(),
                c.requiredComponents(),
                c.sections().stream().map(SectionResponse::from).toList()
        );
    }
}
