export type ScheduleDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export interface PagedResult<T> {
  content: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AvailabilitySlot {
  day: ScheduleDay;
  startTime: string;
  endTime: string;
  available: boolean;
}

export type CourseComponentType = "GENERAL" | "THEORY" | "PRACTICE";

export interface CourseComponentAdmin {
  id: string | null;
  componentType: CourseComponentType;
  weeklyHours: number;
  requiredRoomType: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CourseAdmin {
  id: string;
  code: string;
  name: string;
  cycle: number;
  credits: number;
  requiredCredits: number;
  weeklyHours: number;
  requiredRoomType: string | null;
  isActive: boolean;
  components?: CourseComponentAdmin[];
  prerequisites: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TeacherAdmin {
  id: string;
  userId: string | null;
  code: string;
  fullName: string;
  email: string | null;
  specialty: string;
  isActive: boolean;
  availability: AvailabilitySlot[];
  courseCodes: string[];
  courseComponentIds: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClassroomAdmin {
  id: string;
  code: string;
  name: string;
  capacity: number;
  type: string;
  isActive: boolean;
  availability: AvailabilitySlot[];
  courseCodes: string[];
  courseComponentIds: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudentAdmin {
  id: string;
  userId: string | null;
  code: string;
  fullName: string;
  email: string | null;
  cycle: number;
  career: string | null;
  facultadId: string | null;
  carreraId: string | null;
  creditLimit: number;
  isActive: boolean;
  approvedCourses: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserAdmin {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  role: "ADMIN" | "COORDINATOR" | "TEACHER" | "STUDENT";
  active: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserAdmin["role"];
  active: boolean;
  emailVerified: boolean;
}

export interface FacultadAdmin {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CarreraAdmin {
  id: string;
  facultadId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AcademicPeriodAdmin {
  id: string;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "PLANNING" | "ACTIVE" | "CLOSED";
  maxStudentCredits: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiErrorResponse {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}
