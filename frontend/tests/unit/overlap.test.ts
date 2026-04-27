import { describe, it, expect } from "vitest";
import { timeSlotsOverlap, findTeacherOverlaps } from "@/lib/schedule/overlap";
import type { TimeSlot, Assignment } from "@/types/schedule";

const slot = (day: string, start: string, end: string): TimeSlot => ({
  day,
  startTime: start,
  endTime: end,
});

const assignment = (id: string, teacherId: string, ts: TimeSlot): Assignment => ({
  id,
  courseId: `course-${id}`,
  courseName: `Curso ${id}`,
  courseCode: `C-${id}`,
  teacherId,
  teacherName: `Docente ${teacherId}`,
  classroomId: `room-${teacherId}`,
  classroomCode: `R-${teacherId}`,
  timeSlot: ts,
});

describe("timeSlotsOverlap", () => {
  it("detecta solapamiento total", () => {
    expect(
      timeSlotsOverlap(slot("monday", "08:00", "10:00"), slot("monday", "08:00", "10:00"))
    ).toBe(true);
  });

  it("detecta solapamiento parcial", () => {
    expect(
      timeSlotsOverlap(slot("monday", "08:00", "10:00"), slot("monday", "09:00", "11:00"))
    ).toBe(true);
  });

  it("no detecta conflicto en días distintos", () => {
    expect(
      timeSlotsOverlap(slot("monday", "08:00", "10:00"), slot("tuesday", "08:00", "10:00"))
    ).toBe(false);
  });

  it("no detecta conflicto en franjas contiguas", () => {
    expect(
      timeSlotsOverlap(slot("monday", "08:00", "10:00"), slot("monday", "10:00", "12:00"))
    ).toBe(false);
  });

  it("no detecta conflicto en franjas separadas", () => {
    expect(
      timeSlotsOverlap(slot("monday", "08:00", "10:00"), slot("monday", "11:00", "13:00"))
    ).toBe(false);
  });
});

describe("findTeacherOverlaps", () => {
  it("no devuelve conflictos cuando no hay solapamiento", () => {
    const assignments = [
      assignment("1", "T1", slot("monday", "08:00", "10:00")),
      assignment("2", "T1", slot("monday", "10:00", "12:00")),
    ];
    expect(findTeacherOverlaps(assignments)).toHaveLength(0);
  });

  it("detecta un solapamiento de mismo docente", () => {
    const assignments = [
      assignment("1", "T1", slot("monday", "08:00", "10:00")),
      assignment("2", "T1", slot("monday", "09:00", "11:00")),
    ];
    expect(findTeacherOverlaps(assignments)).toHaveLength(1);
  });

  it("no detecta conflicto entre docentes distintos", () => {
    const assignments = [
      assignment("1", "T1", slot("monday", "08:00", "10:00")),
      assignment("2", "T2", slot("monday", "08:00", "10:00")),
    ];
    expect(findTeacherOverlaps(assignments)).toHaveLength(0);
  });
});
