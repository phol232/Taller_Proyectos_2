import api from "@/lib/api";
import type {
  AddCourseAssignmentPayload,
  RemovedSlotResult,
  ScheduleAssignment,
  SlotConflict,
  SlotInputPayload,
  TimeSlot,
  ValidateSlotPayload,
} from "@/types/scheduleBuilder";

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const { data } = await api.get<TimeSlot[]>("/api/schedules/time-slots");
  return data;
}

export async function getScheduleAssignments(scheduleId: string): Promise<ScheduleAssignment[]> {
  const { data } = await api.get<ScheduleAssignment[]>(`/api/schedules/${scheduleId}/assignments`);
  return data;
}

export async function addCourseAssignment(
  scheduleId: string,
  payload: AddCourseAssignmentPayload,
): Promise<{ assignmentId: string }> {
  const { data } = await api.post<{ assignmentId: string }>(
    `/api/schedules/${scheduleId}/assignments`,
    payload,
  );
  return data;
}

export async function removeAssignment(assignmentId: string): Promise<void> {
  await api.delete(`/api/schedules/assignments/${assignmentId}`);
}

export async function addSlot(
  assignmentId: string,
  payload: SlotInputPayload,
): Promise<{ slotId: string }> {
  const { data } = await api.post<{ slotId: string }>(
    `/api/schedules/assignments/${assignmentId}/slots`,
    payload,
  );
  return data;
}

export async function removeSlot(slotId: string): Promise<RemovedSlotResult> {
  const { data } = await api.delete<RemovedSlotResult>(`/api/schedules/slots/${slotId}`);
  return data;
}

export async function validateSlot(
  scheduleId: string,
  payload: ValidateSlotPayload,
): Promise<SlotConflict[]> {
  const { data } = await api.post<SlotConflict[]>(
    `/api/schedules/${scheduleId}/validate`,
    payload,
  );
  return data;
}
