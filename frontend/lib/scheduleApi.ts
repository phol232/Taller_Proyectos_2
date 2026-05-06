import api from "@/lib/api";
import type {
  ConfirmScheduleResponse,
  CourseSection,
  ScheduleGenerationRequest,
  ScheduleGenerationResponse,
  ScheduleGenerationRun,
  ScheduleOption,
  TimetableSlot,
} from "@/types/schedule";

export async function getSectionsBySchedule(scheduleId: string): Promise<CourseSection[]> {
  const { data } = await api.get<CourseSection[]>(`/api/schedules/${scheduleId}/sections`);
  return data;
}

export async function generateScheduleOption(
  payload: ScheduleGenerationRequest,
): Promise<ScheduleGenerationResponse> {
  const { data } = await api.post<ScheduleGenerationResponse>("/api/schedules/generations", payload);
  return data;
}

export async function getScheduleOptions(academicPeriodId: string): Promise<ScheduleOption[]> {
  const { data } = await api.get<ScheduleOption[]>("/api/schedules/options", {
    params: { academicPeriodId },
  });
  return data;
}

export async function getScheduleGenerationRun(runId: string): Promise<ScheduleGenerationRun> {
  const { data } = await api.get<ScheduleGenerationRun>(`/api/schedules/generations/${runId}`);
  return data;
}

export async function confirmScheduleOption(scheduleId: string): Promise<ConfirmScheduleResponse> {
  const { data } = await api.post<ConfirmScheduleResponse>(`/api/schedules/${scheduleId}/confirm`);
  return data;
}

export async function getTimetable(scheduleId: string): Promise<TimetableSlot[]> {
  const { data } = await api.get<TimetableSlot[]>(`/api/schedules/${scheduleId}/timetable`);
  return data;
}

export async function cancelScheduleOption(scheduleId: string): Promise<void> {
  await api.delete(`/api/schedules/${scheduleId}`, {
    suppressGlobalErrorToast: true,
  });
}
