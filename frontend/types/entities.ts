export type Role = "admin" | "coordinator" | "teacher" | "student";

export type SexType = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface ProfileResponse {
  id:        string | null;
  userId:    string;
  fullName:  string;
  email:     string;
  role:      string;
  dni:       string | null;
  phone:     string | null;
  sex:       SexType | null;
  age:       number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

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
