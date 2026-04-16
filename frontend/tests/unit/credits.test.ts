import { describe, it, expect } from "vitest";
import { sumCredits, exceedsLimit } from "@/lib/schedule/credits";
import type { Assignment } from "@/types/schedule";

const makeAssignment = (courseId: string): Assignment => ({
  id: courseId,
  courseId,
  courseName: `Curso ${courseId}`,
  courseCode: courseId,
  section: "A",
  teacherId: "T1",
  teacherName: "Docente 1",
  classroomId: "R1",
  classroomCode: "R1",
  timeSlot: { day: "monday", startTime: "08:00", endTime: "10:00" },
});

describe("sumCredits", () => {
  it("suma correctamente los créditos de las asignaciones", () => {
    const assignments = [
      makeAssignment("C1"),
      makeAssignment("C2"),
      makeAssignment("C3"),
    ];
    const creditMap = { C1: 4, C2: 3, C3: 5 };
    expect(sumCredits(assignments, creditMap)).toBe(12);
  });

  it("maneja cursos sin créditos en el mapa (0 por defecto)", () => {
    const assignments = [makeAssignment("C1"), makeAssignment("CX")];
    const creditMap = { C1: 4 };
    expect(sumCredits(assignments, creditMap)).toBe(4);
  });

  it("devuelve 0 para lista vacía", () => {
    expect(sumCredits([], {})).toBe(0);
  });
});

describe("exceedsLimit", () => {
  it("devuelve true cuando se excede el límite", () => {
    expect(exceedsLimit(18, 5, 22)).toBe(true);
  });

  it("devuelve false cuando se alcanza exactamente el límite", () => {
    expect(exceedsLimit(17, 5, 22)).toBe(false);
  });

  it("devuelve false cuando queda espacio", () => {
    expect(exceedsLimit(15, 4, 22)).toBe(false);
  });
});
