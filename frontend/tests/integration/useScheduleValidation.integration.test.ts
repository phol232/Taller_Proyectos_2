import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScheduleValidation } from "@/hooks/useScheduleValidation";
import type { Assignment, TimeSlot } from "@/types/schedule";

const makeTimeSlot = (day = "MONDAY", start = "07:00", end = "08:30"): TimeSlot => ({
  day,
  startTime: start,
  endTime: end,
});

const makeAssignment = (
  id: string,
  courseId: string,
  courseCode: string,
  day = "TUESDAY",
  start = "09:00",
  end = "10:30",
): Assignment => ({
  id,
  courseId,
  courseName: `Curso ${courseCode}`,
  courseCode,
  teacherId: "teacher-1",
  teacherName: "Docente",
  classroomId: "classroom-1",
  classroomCode: "A-101",
  timeSlot: { day, startTime: start, endTime: end },
});

const baseInput = {
  newCourseId: "course-new",
  newTimeSlot: makeTimeSlot("MONDAY", "07:00", "08:30"),
  newCredits: 4,
  prerequisites: [] as string[],
  approvedCourses: [] as string[],
  currentAssignments: [] as Assignment[],
  currentTotalCredits: 0,
  creditLimit: 20,
  vacancies: 5,
};

describe("useScheduleValidation — integración", () => {
  it("retorna lista vacía cuando no hay conflictos", () => {
    const { result } = renderHook(() => useScheduleValidation());

    const conflicts = result.current.validate(baseInput);
    expect(conflicts).toEqual([]);
  });

  describe("validación de prerrequisitos (RF-05, RF-14)", () => {
    it("detecta prerrequisito no aprobado", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        prerequisites: ["INF-101"],
        approvedCourses: [],
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("prerequisite_missing");
      expect(conflicts[0].message).toContain("INF-101");
      expect(conflicts[0].resource).toBe("course-new");
    });

    it("no detecta conflicto cuando el prerrequisito ya está aprobado", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        prerequisites: ["INF-101"],
        approvedCourses: ["INF-101"],
      });

      expect(conflicts.find((c) => c.type === "prerequisite_missing")).toBeUndefined();
    });

    it("detecta múltiples prerrequisitos faltantes", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        prerequisites: ["INF-101", "MAT-101", "FIS-101"],
        approvedCourses: ["INF-101"],
      });

      const prereqConflict = conflicts.find((c) => c.type === "prerequisite_missing");
      expect(prereqConflict).toBeDefined();
      expect(prereqConflict?.message).toContain("MAT-101");
      expect(prereqConflict?.message).toContain("FIS-101");
    });
  });

  describe("validación de límite de créditos (RF-13, RF-14)", () => {
    it("detecta exceso de créditos", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        newCredits: 5,
        currentTotalCredits: 18,
        creditLimit: 20,
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("credits_exceeded");
      expect(conflicts[0].message).toContain("23");
      expect(conflicts[0].message).toContain("20");
    });

    it("no detecta conflicto cuando los créditos exactamente alcanzan el límite", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        newCredits: 4,
        currentTotalCredits: 16,
        creditLimit: 20,
      });

      expect(conflicts.find((c) => c.type === "credits_exceeded")).toBeUndefined();
    });

    it("no detecta conflicto cuando los créditos están bien dentro del límite", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        newCredits: 3,
        currentTotalCredits: 10,
        creditLimit: 20,
      });

      expect(conflicts.find((c) => c.type === "credits_exceeded")).toBeUndefined();
    });
  });

  describe("validación de vacantes (RF-14)", () => {
    it("detecta cuando no hay vacantes disponibles", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({
        ...baseInput,
        vacancies: 0,
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("no_vacancy");
      expect(conflicts[0].message).toContain("vacantes");
    });

    it("no detecta conflicto cuando hay al menos una vacante", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({ ...baseInput, vacancies: 1 });
      expect(conflicts.find((c) => c.type === "no_vacancy")).toBeUndefined();
    });

    it("detecta vacantes negativas como sin disponibilidad", () => {
      const { result } = renderHook(() => useScheduleValidation());

      const conflicts = result.current.validate({ ...baseInput, vacancies: -1 });
      expect(conflicts.find((c) => c.type === "no_vacancy")).toBeDefined();
    });
  });

  describe("validación de solapamiento (RF-14)", () => {
    it("detecta solapamiento con una asignación existente", () => {
      const { result } = renderHook(() => useScheduleValidation());
      const existing = makeAssignment("1", "course-1", "INF-101", "MONDAY", "07:00", "08:30");

      const conflicts = result.current.validate({
        ...baseInput,
        newTimeSlot: makeTimeSlot("MONDAY", "07:00", "08:30"),
        currentAssignments: [existing],
      });

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe("overlap_student");
      expect(conflicts[0].message).toContain("INF-101");
      expect(conflicts[0].resource).toBe("course-1");
    });

    it("detecta solapamiento parcial con asignación existente", () => {
      const { result } = renderHook(() => useScheduleValidation());
      const existing = makeAssignment("1", "course-1", "INF-101", "FRIDAY", "07:00", "09:00");

      const conflicts = result.current.validate({
        ...baseInput,
        newTimeSlot: makeTimeSlot("FRIDAY", "08:00", "10:00"),
        currentAssignments: [existing],
      });

      expect(conflicts.find((c) => c.type === "overlap_student")).toBeDefined();
    });

    it("no detecta solapamiento cuando los horarios son consecutivos", () => {
      const { result } = renderHook(() => useScheduleValidation());
      const existing = makeAssignment("1", "course-1", "INF-101", "MONDAY", "07:00", "08:30");

      const conflicts = result.current.validate({
        ...baseInput,
        newTimeSlot: makeTimeSlot("MONDAY", "08:30", "10:00"),
        currentAssignments: [existing],
      });

      expect(conflicts.find((c) => c.type === "overlap_student")).toBeUndefined();
    });

    it("no detecta solapamiento cuando los cursos son en días distintos", () => {
      const { result } = renderHook(() => useScheduleValidation());
      const existing = makeAssignment("1", "course-1", "INF-101", "MONDAY", "07:00", "08:30");

      const conflicts = result.current.validate({
        ...baseInput,
        newTimeSlot: makeTimeSlot("TUESDAY", "07:00", "08:30"),
        currentAssignments: [existing],
      });

      expect(conflicts.find((c) => c.type === "overlap_student")).toBeUndefined();
    });
  });

  it("detecta múltiples tipos de conflicto simultáneamente", () => {
    const { result } = renderHook(() => useScheduleValidation());
    const existing = makeAssignment("1", "course-1", "INF-101", "MONDAY", "07:00", "08:30");

    const conflicts = result.current.validate({
      newCourseId: "course-new",
      newTimeSlot: makeTimeSlot("MONDAY", "07:00", "08:30"),
      newCredits: 6,
      prerequisites: ["MAT-100"],
      approvedCourses: [],
      currentAssignments: [existing],
      currentTotalCredits: 18,
      creditLimit: 20,
      vacancies: 0,
    });

    expect(conflicts.some((c) => c.type === "prerequisite_missing")).toBe(true);
    expect(conflicts.some((c) => c.type === "credits_exceeded")).toBe(true);
    expect(conflicts.some((c) => c.type === "no_vacancy")).toBe(true);
    expect(conflicts.some((c) => c.type === "overlap_student")).toBe(true);
  });

  it("la función validate está memoizada con useCallback", () => {
    const { result, rerender } = renderHook(() => useScheduleValidation());
    const firstValidate = result.current.validate;

    rerender();

    expect(result.current.validate).toBe(firstValidate);
  });
});
