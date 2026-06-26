package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.SolverRunAccepted;

import java.util.List;
import java.util.UUID;

public interface SolverClientPort {
    SolverRunAccepted runTeacherSchedule(
            UUID academicPeriodId,
            UUID requestedBy,
            int seed,
            int timeLimitMs,
            UUID reservationId,
            List<UUID> classroomIds
    );

    SolverRunAccepted runStudentSchedule(
            UUID academicPeriodId,
            UUID requestedBy,
            UUID studentId,
            int seed,
            int timeLimitMs
    );
}
