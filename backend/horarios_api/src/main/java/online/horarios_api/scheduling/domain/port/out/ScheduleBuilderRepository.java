package online.horarios_api.scheduling.domain.port.out;

import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.model.TimeSlot;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface ScheduleBuilderRepository {

    List<TimeSlot> listActiveTimeSlots();

    List<ScheduleAssignment> listAssignments(UUID scheduleId);

    boolean teacherTeachesComponent(UUID teacherId, UUID courseComponentId);

    List<UUID> timeSlotIdsOutsideTeacherAvailability(UUID teacherId, List<UUID> timeSlotIds);

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
