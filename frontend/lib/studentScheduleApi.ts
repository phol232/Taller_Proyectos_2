import api from "@/lib/api";
import type {
  ActiveStudentSchedule,
  StudentMe,
  StudentPendingCourse,
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
