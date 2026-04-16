export type Role = "admin" | "coordinator" | "teacher" | "student";

export interface Student {
  id: string;
  code: string;
  name: string;
  cycle: number;
  career: string;
  approvedCourses: string[]; // course codes
}

export interface Teacher {
  id: string;
  code: string;
  name: string;
  specialty: string;
  availability: TimeSlotAvailability[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number; // 1–6
  weeklyHours: number; // >= 1
  prerequisites: string[]; // course codes
}

export interface Classroom {
  id: string;
  code: string;
  capacity: number; // > 0
  type: string;
  availability: TimeSlotAvailability[];
}

export interface TimeSlotAvailability {
  day: Day;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  available: boolean;
}

export type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
