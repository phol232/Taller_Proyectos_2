package online.horarios_api.scheduling.domain.port.in;

import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.model.TimeSlot;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface ScheduleBuilderUseCase {

    List<TimeSlot> listActiveTimeSlots();

    List<ScheduleAssignment> listAssignments(UUID scheduleId);

    UUID addCourse(UUID scheduleId,
                   UUID courseComponentId,
                   UUID teacherId,
                   UUID sectionId,
                   List<SlotInput> slots);

    UUID addSlot(UUID assignmentId, SlotInput slot);

    RemovedSlotResult removeSlot(UUID slotId);

    void removeAssignment(UUID assignmentId);

    List<SlotConflict> validateSlot(UUID scheduleId,
                                    UUID assignmentId,
                                    UUID teacherId,
                                    UUID classroomId,
                                    UUID timeSlotId,
                                    LocalTime startTime,
                                    LocalTime endTime,
                                    UUID excludeSlotId);
}
