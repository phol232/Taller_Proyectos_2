package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.ActiveStudentSchedule;
import online.horarios_api.scheduling.domain.model.StudentPendingCourse;
import online.horarios_api.scheduling.domain.model.StudentScheduleOption;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentScheduleRepository {

    List<StudentPendingCourse> listPendingCourses(UUID studentId, UUID academicPeriodId);

    Optional<ActiveStudentSchedule> findActiveSchedule(UUID studentId, UUID academicPeriodId);

    List<StudentScheduleOption> listScheduleOptions(UUID studentId, UUID academicPeriodId);

    String confirmSchedule(UUID studentId, UUID scheduleId);

    int renewHolds(UUID scheduleId, int ttlSeconds);

    void releaseOption(UUID scheduleId);

    /** Libera los holds de cupo vencidos. Devuelve cuántos se liberaron. */
    int expireSeatHolds();
}
