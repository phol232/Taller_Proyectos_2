import api from "@/lib/api";
import type { Conflict } from "@/types/schedule";
import type { StudentBuilderDraft } from "@/types/studentSchedule";

export async function getStudentBuilderDraft(
  studentId: string,
  periodIdOrOptions: string | { periodId?: string; scheduleId?: string },
): Promise<StudentBuilderDraft | null> {
  const params: Record<string, string> =
    typeof periodIdOrOptions === "string"
      ? { periodId: periodIdOrOptions }
      : periodIdOrOptions.scheduleId
        ? { scheduleId: periodIdOrOptions.scheduleId }
        : { periodId: periodIdOrOptions.periodId ?? "" };

  const { data, status } = await api.get<StudentBuilderDraft>(
    `/api/students/${studentId}/schedule/builder`,
    { params, validateStatus: (s) => s === 200 || s === 204 },
  );
  if (status === 204) return null;
  return data;
}

export async function ensureStudentBuilderDraft(
  studentId: string,
  periodId: string,
): Promise<string> {
  const { data } = await api.post<{ scheduleId: string }>(
    `/api/students/${studentId}/schedule/builder/ensure`,
    null,
    { params: { periodId } },
  );
  return data.scheduleId;
}

export async function validateStudentBuilderCourse(
  studentId: string,
  scheduleId: string,
  courseId: string,
  assignmentIds: string[],
): Promise<Conflict[]> {
  const { data } = await api.post<Array<{ conflictType: string; message: string; resourceId: string | null }>>(
    `/api/students/${studentId}/schedule/builder/validate`,
    { scheduleId, courseId, assignmentIds },
  );
  return data.map((c) => ({
    type: mapConflictType(c.conflictType),
    message: c.message,
    resource: c.resourceId ?? undefined,
  }));
}

export async function addStudentBuilderCourse(
  studentId: string,
  scheduleId: string,
  courseId: string,
  assignmentIds: string[],
): Promise<string> {
  const { data } = await api.post<{ itemId: string }>(
    `/api/students/${studentId}/schedule/builder/courses`,
    { courseId, assignmentIds },
    { params: { scheduleId } },
  );
  return data.itemId;
}

export async function removeStudentBuilderCourse(
  studentId: string,
  scheduleId: string,
  courseId: string,
): Promise<void> {
  await api.delete(`/api/students/${studentId}/schedule/builder/courses/${courseId}`, {
    params: { scheduleId },
  });
}

export async function renewStudentBuilderDraft(
  studentId: string,
  scheduleId: string,
): Promise<void> {
  await api.post(`/api/students/${studentId}/schedule/builder/renew`, null, {
    params: { scheduleId },
  });
}

export async function importStudentBuilderFromOption(
  studentId: string,
  periodId: string,
  sourceScheduleId: string,
): Promise<string> {
  const { data } = await api.post<{ scheduleId: string }>(
    `/api/students/${studentId}/schedule/builder/import`,
    { sourceScheduleId },
    { params: { periodId } },
  );
  return data.scheduleId;
}

function mapConflictType(type: string): Conflict["type"] {
  switch (type) {
    case "PREREQUISITE_MISSING":
      return "prerequisite_missing";
    case "CREDITS_EXCEEDED":
      return "credits_exceeded";
    case "NO_VACANCY":
      return "no_vacancy";
    case "OVERLAP":
      return "overlap_student";
    case "DUPLICATE_COURSE":
      return "overlap_student";
    default:
      return "overlap_student";
  }
}
