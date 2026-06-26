import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WeeklyGrid from "@/components/schedule/WeeklyGrid";
import type { TimetableSlot } from "@/types/schedule";

const slots: TimetableSlot[] = [
  {
    slotId: "s1",
    classroomId: "cl1",
    classroomCode: "A-101",
    classroomName: "Aula 101",
    classroomType: "THEORY",
    teacherId: "t1",
    teacherCode: "T001",
    teacherName: "Prof. García",
    courseId: "c1",
    courseCode: "MAT-101",
    courseName: "Matemáticas",
    componentType: "THEORY",
    sectionId: "sec1",
    nrc: "12345",
    sectionNumber: 1,
    dayOfWeek: "MONDAY",
    startTime: "08:00:00",
    endTime: "10:00:00",
  },
];

describe("WeeklyGrid", () => {
  it("muestra bloques del horario", () => {
    render(<WeeklyGrid slots={slots} mode="readonly" />);
    expect(screen.getByText("MAT-101")).toBeInTheDocument();
    expect(screen.getByText("Prof. García")).toBeInTheDocument();
  });

  it("muestra mensaje vacío sin slots", () => {
    render(<WeeklyGrid slots={[]} emptyMessage="Sin cursos" />);
    expect(screen.getByText("Sin cursos")).toBeInTheDocument();
  });
});
