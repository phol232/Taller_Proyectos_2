export interface ScheduleAssignmentSlot {
  slotId: string;
  timeSlotId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroomId: string;
  classroomCode: string;
  classroomName: string;
}

export interface ScheduleAssignment {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  courseComponentId: string;
  componentType: "THEORY" | "PRACTICE" | "GENERAL";
  componentWeeklyHours: number;
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  sectionId: string | null;
  sectionNrc: string | null;
  assignmentStatus: "DRAFT" | "CONFIRMED" | "CANCELLED";
  assignedHours: number;
  complete: boolean;
  slots: ScheduleAssignmentSlot[];
}

export interface SlotInputPayload {
  classroomId: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
}

export interface AddCourseAssignmentPayload {
  courseComponentId: string;
  teacherId: string;
  sectionId?: string | null;
  slots?: SlotInputPayload[];
}

export interface RemovedSlotResult {
  assignmentId: string;
  assignmentLeftIncomplete: boolean;
  assignedHours: number;
  requiredHours: number;
}

export interface SlotConflict {
  conflictType: "TEACHER_BUSY" | "CLASSROOM_BUSY" | "DUPLICATE";
  resourceId: string | null;
  message: string;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  slotOrder: number;
}

export interface ValidateSlotPayload {
  assignmentId?: string | null;
  teacherId: string;
  classroomId: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
  excludeSlotId?: string | null;
}
