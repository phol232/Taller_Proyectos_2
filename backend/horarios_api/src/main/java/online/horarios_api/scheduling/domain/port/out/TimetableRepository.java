package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.TimetableSlot;

import java.util.List;
import java.util.UUID;

public interface TimetableRepository {
    List<TimetableSlot> findByTeachingScheduleId(UUID teachingScheduleId);

    List<TimetableSlot> findByStudentScheduleId(UUID studentScheduleId);
}
