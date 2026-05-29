package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentScheduleUseCase {

    List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId);

    Optional<ActiveStudentSchedule> getActiveSchedule(UUID studentId, UUID academicPeriodId);
}
