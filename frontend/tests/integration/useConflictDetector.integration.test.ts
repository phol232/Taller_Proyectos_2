import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConflictDetector } from "@/hooks/useConflictDetector";
import type { Assignment } from "@/types/schedule";

const makeAssignment = (
  id: string,
  courseCode: string,
  teacherId: string,
  classroomId: string,
  day: string,
  start: string,
  end: string,
): Assignment => ({
  id,
  courseId: `course-${id}`,
  courseName: `Curso ${courseCode}`,
  courseCode,
  teacherId,
  teacherName: `Docente ${teacherId}`,
  classroomId,
  classroomCode: `AULA-${classroomId}`,
  timeSlot: { day, startTime: start, endTime: end },
});

describe("useConflictDetector — integración", () => {
  it("retorna lista vacía cuando no hay asignaciones", () => {
    const { result } = renderHook(() => useConflictDetector());

    const conflicts = result.current.detect([]);
    expect(conflicts).toEqual([]);
  });

  it("retorna lista vacía cuando una sola asignación no tiene conflictos", () => {
    const { result } = renderHook(() => useConflictDetector());
    const assignments = [
      makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
    ];

    expect(result.current.detect(assignments)).toEqual([]);
  });

  it("retorna lista vacía cuando múltiples asignaciones no se solapan", () => {
    const { result } = renderHook(() => useConflictDetector());
    const assignments = [
      makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
      makeAssignment("2", "INF-102", "teacher-2", "classroom-2", "MONDAY", "09:00", "10:30"),
      makeAssignment("3", "INF-103", "teacher-3", "classroom-3", "TUESDAY", "07:00", "08:30"),
    ];

    expect(result.current.detect(assignments)).toEqual([]);
  });

  describe("solapamiento de docente", () => {
    it("detecta solapamiento cuando el mismo docente tiene dos clases en el mismo horario", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
        makeAssignment("2", "INF-102", "teacher-1", "classroom-2", "MONDAY", "07:00", "08:30"),
      ];

      const conflicts = result.current.detect(assignments);

      const teacherConflict = conflicts.find((c) => c.type === "overlap_teacher");
      expect(teacherConflict).toBeDefined();
      expect(teacherConflict?.resource).toBe("teacher-1");
      expect(teacherConflict?.message).toContain("INF-101");
      expect(teacherConflict?.message).toContain("INF-102");
    });

    it("detecta solapamiento parcial del mismo docente", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "FRIDAY", "07:00", "09:00"),
        makeAssignment("2", "INF-102", "teacher-1", "classroom-2", "FRIDAY", "08:00", "10:00"),
      ];

      const conflicts = result.current.detect(assignments);
      expect(conflicts.some((c) => c.type === "overlap_teacher")).toBe(true);
    });

    it("no detecta conflicto cuando el mismo docente tiene clases en días distintos", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
        makeAssignment("2", "INF-102", "teacher-1", "classroom-2", "TUESDAY", "07:00", "08:30"),
      ];

      expect(result.current.detect(assignments)).toEqual([]);
    });

    it("no detecta conflicto cuando el mismo docente tiene clases consecutivas sin solapamiento", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
        makeAssignment("2", "INF-102", "teacher-1", "classroom-2", "MONDAY", "08:30", "10:00"),
      ];

      expect(result.current.detect(assignments)).toEqual([]);
    });
  });

  describe("solapamiento de aula", () => {
    it("detecta solapamiento cuando el misma aula tiene dos clases en el mismo horario", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "WEDNESDAY", "07:00", "08:30"),
        makeAssignment("2", "INF-102", "teacher-2", "classroom-1", "WEDNESDAY", "07:00", "08:30"),
      ];

      const conflicts = result.current.detect(assignments);

      const classroomConflict = conflicts.find((c) => c.type === "overlap_classroom");
      expect(classroomConflict).toBeDefined();
      expect(classroomConflict?.resource).toBe("classroom-1");
    });

    it("no detecta conflicto cuando el misma aula se usa en horarios diferentes", () => {
      const { result } = renderHook(() => useConflictDetector());
      const assignments = [
        makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "MONDAY", "07:00", "08:30"),
        makeAssignment("2", "INF-102", "teacher-2", "classroom-1", "MONDAY", "09:00", "10:30"),
      ];

      expect(result.current.detect(assignments)).toEqual([]);
    });
  });

  it("detecta simultáneamente conflictos de docente y aula", () => {
    const { result } = renderHook(() => useConflictDetector());
    const assignments = [
      makeAssignment("1", "INF-101", "teacher-1", "classroom-1", "THURSDAY", "07:00", "08:30"),
      makeAssignment("2", "INF-102", "teacher-1", "classroom-1", "THURSDAY", "07:00", "08:30"),
    ];

    const conflicts = result.current.detect(assignments);

    expect(conflicts.some((c) => c.type === "overlap_teacher")).toBe(true);
    expect(conflicts.some((c) => c.type === "overlap_classroom")).toBe(true);
  });

  it("la función detect está memoizada con useCallback", () => {
    const { result, rerender } = renderHook(() => useConflictDetector());
    const firstDetect = result.current.detect;

    rerender();

    expect(result.current.detect).toBe(firstDetect);
  });
});
