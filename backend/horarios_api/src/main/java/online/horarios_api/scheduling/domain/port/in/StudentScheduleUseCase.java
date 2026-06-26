package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.scheduling.domain.model.StudentScheduleGeneration;
import online.horarios_api.scheduling.domain.model.StudentScheduleOption;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentScheduleUseCase {

    List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId);

    Optional<ActiveStudentSchedule> getActiveSchedule(UUID studentId, UUID academicPeriodId);

    StudentScheduleGeneration generateOptions(
            UUID studentId, UUID actorId, UUID academicPeriodId, Integer timeLimitMs);

    List<StudentScheduleOption> listOptions(UUID studentId, UUID academicPeriodId);

    UUID confirmOption(UUID studentId, UUID scheduleId);

    void renewOption(UUID studentId, UUID scheduleId);

    void releaseOption(UUID studentId, UUID scheduleId);
}
