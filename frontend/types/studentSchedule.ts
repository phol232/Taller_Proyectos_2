import type { ScheduleAssignmentSlot } from "./scheduleBuilder";

export interface PendingCourseSectionComponent {
  assignmentId: string;
  courseComponentId: string;
  componentType: "THEORY" | "PRACTICE" | "GENERAL";
  componentWeeklyHours: number;
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  slots: ScheduleAssignmentSlot[];
}

export interface PendingCoursePrerequisite {
  prerequisiteCourseId: string;
  prerequisiteCode: string;
  isSatisfied: boolean;
}

export interface PendingCourseSection {
  sectionId: string;
  nrc: string | null;
  sectionNumber: number | null;
  availableVacancies: number | null;
  components: PendingCourseSectionComponent[];
}

export interface StudentPendingCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseCycle: number;
  courseCredits: number;
  courseWeeklyHours: number;
  requiredComponents: number;
  prerequisites: PendingCoursePrerequisite[];
  sections: PendingCourseSection[];
}

export interface ActiveStudentScheduleItemComponent {
  courseComponentId: string;
  courseAssignmentId: string;
}

export interface ActiveStudentScheduleItem {
  studentScheduleItemId: string;
  courseId: string;
  components: ActiveStudentScheduleItemComponent[];
}

export interface ActiveStudentSchedule {
  scheduleId: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  items: ActiveStudentScheduleItem[];
}

export interface StudentMe {
  id: string;
  userId: string | null;
  code: string;
  fullName: string;
  cycle: number;
  creditLimit: number;
  carreraId: string | null;
  facultadId: string | null;
}

/** Una opción de horario en borrador con su tiempo de hold (bloqueo de cupo). */
export interface StudentScheduleOption {
  scheduleId: string;
  optionIndex: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  secondsRemaining: number;
  itemCount: number;
}

/** Resultado de disparar la generación de una opción de horario. */
export interface StudentScheduleGeneration {
  solverRunId: string;
  status: string;
  websocketUrl: string;
  warning: string | null;
}

export interface StudentBuilderCourseItem {
  itemId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  courseCredits: number;
  sectionId: string | null;
  nrc: string | null;
  sectionNumber: number | null;
  components: Array<{
    courseComponentId: string;
    courseAssignmentId: string;
    componentType: string;
  }>;
}

export interface StudentBuilderDraft {
  scheduleId: string;
  optionIndex: number;
  status: string;
  draftSource: string;
  creditLimit: number;
  totalCredits: number;
  expiresAt: string | null;
  secondsRemaining: number;
  liveDraftCount: number;
  items: StudentBuilderCourseItem[];
}
