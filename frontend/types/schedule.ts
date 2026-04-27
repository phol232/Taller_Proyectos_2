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

export interface Conflict {
  type: "overlap_teacher" | "overlap_classroom" | "overlap_student" | "credits_exceeded" | "prerequisite_missing" | "no_vacancy" | "no_solution";
  message: string;
  resource?: string;
  timeSlot?: TimeSlot;
  details?: string;
}
