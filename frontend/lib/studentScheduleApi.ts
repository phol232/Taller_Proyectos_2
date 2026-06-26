import api from "@/lib/api";
import type { ConfirmScheduleResponse, TimetableSlot } from "@/types/schedule";
import type {
  ActiveStudentSchedule,
  StudentMe,
  StudentPendingCourse,
  StudentScheduleGeneration,
  StudentScheduleOption,
} from "@/types/studentSchedule";

export async function getCurrentStudent(): Promise<StudentMe> {
  const { data } = await api.get<StudentMe>("/api/students/me");
  return data;
}

export async function getStudentAvailableCourses(
  studentId: string,
  periodId: string,
): Promise<StudentPendingCourse[]> {
  const { data } = await api.get<StudentPendingCourse[]>(
    `/api/students/${studentId}/available-courses`,
    { params: { periodId } },
  );
  return data;
}

export async function getStudentActiveSchedule(
  studentId: string,
  periodId: string,
): Promise<ActiveStudentSchedule | null> {
  const { data, status } = await api.get<ActiveStudentSchedule>(
    `/api/students/${studentId}/schedule`,
    { params: { periodId }, suppressGlobalErrorToast: true, validateStatus: (s) => s === 200 || s === 204 },
  );
  if (status === 204) return null;
  return data;
}

/** Dispara la generación de una opción de horario (reserva cupo temporalmente). */
export async function generateStudentScheduleOption(
  studentId: string,
  periodId: string,
): Promise<StudentScheduleGeneration> {
  const { data } = await api.post<StudentScheduleGeneration>(
    `/api/students/${studentId}/schedule/generate`,
    null,
    { params: { periodId } },
  );
  return data;
}

export async function getStudentScheduleOptions(
  studentId: string,
  periodId: string,
): Promise<StudentScheduleOption[]> {
  const { data } = await api.get<StudentScheduleOption[]>(
    `/api/students/${studentId}/schedule/options`,
    { params: { periodId } },
  );
  return data;
}

/** Confirma una opción. Lanza 409 si el cupo expiró (se maneja localmente). */
export async function confirmStudentScheduleOption(
  studentId: string,
  scheduleId: string,
): Promise<ConfirmScheduleResponse> {
  const { data } = await api.post<ConfirmScheduleResponse>(
    `/api/students/${studentId}/schedule/options/${scheduleId}/confirm`,
    null,
    { suppressGlobalErrorToast: true },
  );
  return data;
}

export async function renewStudentScheduleOption(
  studentId: string,
  scheduleId: string,
): Promise<void> {
  await api.post(`/api/students/${studentId}/schedule/options/${scheduleId}/renew`);
}

export async function releaseStudentScheduleOption(
  studentId: string,
  scheduleId: string,
): Promise<void> {
  await api.delete(`/api/students/${studentId}/schedule/options/${scheduleId}`);
}

/** Slots de una opción de horario en formato calendario. */
export async function getStudentOptionTimetable(
  studentId: string,
  scheduleId: string,
): Promise<TimetableSlot[]> {
  const { data } = await api.get<TimetableSlot[]>(
    `/api/students/${studentId}/schedule/options/${scheduleId}/timetable`,
  );
  return data;
}

/** Timetable del horario confirmado del estudiante en el período. */
export async function getStudentConfirmedTimetable(
  studentId: string,
  periodId: string,
): Promise<TimetableSlot[]> {
  const { data, status } = await api.get<TimetableSlot[]>(
    `/api/students/${studentId}/schedule/timetable`,
    { params: { periodId }, validateStatus: (s) => s === 200 || s === 204 },
  );
  if (status === 204) return [];
  return data;
}
