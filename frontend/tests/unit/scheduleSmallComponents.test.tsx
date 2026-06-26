import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CsvListInput } from "@/components/admin/CsvListInput";
import ConflictBadge from "@/components/schedule/ConflictBadge";
import ScheduleBlock from "@/components/schedule/ScheduleBlock";
import WeeklyGrid from "@/components/schedule/WeeklyGrid";
import { I18nProvider } from "@/lib/i18n";
import type { Assignment, Conflict } from "@/types/schedule";

describe("ConflictBadge", () => {
  it("muestra el mensaje del conflicto", () => {
    const conflict: Conflict = {
      type: "overlap_teacher",
      message: "Solapamiento de docente",
      details: "Detalle del conflicto",
    };
    render(<ConflictBadge conflict={conflict} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Solapamiento de docente");
    expect(screen.getByRole("alert")).toHaveAttribute("title", "Detalle del conflicto");
  });
});

describe("ScheduleBlock", () => {
  const assignment: Assignment = {
    id: "a-1",
    courseId: "course-1",
    courseName: "Programación I",
    courseCode: "INF-101",
    teacherId: "teacher-1",
    teacherName: "Docente Uno",
    classroomId: "classroom-1",
    classroomCode: "A-101",
    timeSlot: { day: "MONDAY", startTime: "07:00", endTime: "08:30" },
  };

  it("renderiza datos del bloque sin conflicto", () => {
    render(<ScheduleBlock assignment={assignment} />);
    expect(screen.getByText("INF-101")).toBeInTheDocument();
    expect(screen.getByText("Docente Uno")).toBeInTheDocument();
    expect(screen.getByText("A-101")).toBeInTheDocument();
  });

  it("aplica estilos de conflicto", () => {
    const { container } = render(<ScheduleBlock assignment={assignment} hasConflict />);
    expect(container.firstChild).toHaveClass("border-ship-red");
  });
});

describe("WeeklyGrid", () => {
  it("muestra mensaje cuando no hay slots", () => {
    render(<WeeklyGrid slots={[]} emptyMessage="Grilla vacía" />);
    expect(screen.getByText("Grilla vacía")).toBeInTheDocument();
  });
});

describe("CsvListInput", () => {
  it("convierte texto CSV en lista al escribir", () => {
    const onChange = vi.fn();

    render(
      <CsvListInput
        label="Cursos aprobados"
        value={["INF-101"]}
        onChange={onChange}
        placeholder="INF-101, MAT-201"
      />,
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "INF-101, MAT-201 , , FIS-101" } });

    expect(onChange).toHaveBeenLastCalledWith(["INF-101", "MAT-201", "FIS-101"]);
  });

  it("muestra error y ayuda", () => {
    render(
      <CsvListInput
        label="Cursos"
        value={[]}
        onChange={vi.fn()}
        error="Campo requerido"
        helpText="Separados por coma"
      />,
    );
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
    expect(screen.getByText("Separados por coma")).toBeInTheDocument();
  });
});
