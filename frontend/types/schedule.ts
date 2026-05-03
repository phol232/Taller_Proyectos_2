export interface TimeSlot {
  day: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  teacherId: string;
  teacherName: string;
  classroomId: string;
  classroomCode: string;
  timeSlot: TimeSlot;
}

export type ScheduleStatus = "idle" | "draft" | "confirmed" | "cancelled";

export interface WeeklySchedule {
  id: string;
  periodId: string;
  status: ScheduleStatus;
  assignments: Assignment[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseSection {
  id: string;
  nrc: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherId: string | null;
  teacherName: string | null;
  classroomId: string | null;
  classroomCode: string | null;
  timeSlots: TimeSlot[];
}

export interface ScheduleGenerationRequest {
  academicPeriodId: string;
  classroomIds: string[];
  timeLimitMs?: number;
}

export interface ScheduleGenerationResponse {
  solverRunId: string;
  reservationId: string;
  seed: number;
  remaining: number;
  status: string;
  websocketUrl: string;
}

export interface ScheduleGenerationConflict {
  conflictType: string;
  resourceType: string | null;
  resourceId: string | null;
  courseId: string | null;
  timeSlotId: string | null;
  message: string;
  createdAt: string;
}

export interface ScheduleGenerationRun {
  solverRunId: string;
  runType: "TEACHER" | "STUDENT";
  academicPeriodId: string;
  teachingScheduleId: string | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  seed: number | null;
  summary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  conflicts: ScheduleGenerationConflict[];
}

export interface ScheduleOption {
  id: string;
  academicPeriodId: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  solverRunId: string | null;
  seed: number | null;
  offerCount: number;
  slotCount: number;
}

export interface ConfirmScheduleResponse {
  scheduleId: string;
  status: "CONFIRMED";
}

export interface TimetableSlot {
  slotId: string;
  classroomId: string;
  classroomCode: string;
  classroomName: string;
  classroomType: string;
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  componentType: "THEORY" | "PRACTICE" | "GENERAL";
  sectionId: string | null;
  nrc: string | null;
  sectionNumber: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface Conflict {
  type: "overlap_teacher" | "overlap_classroom" | "overlap_student" | "credits_exceeded" | "prerequisite_missing" | "no_vacancy" | "no_solution";
  message: string;
  resource?: string;
  timeSlot?: TimeSlot;
  details?: string;
}
