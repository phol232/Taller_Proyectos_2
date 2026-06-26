import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StudentBuilderCourseDetailDialog from "@/components/schedule/student/StudentBuilderCourseDetailDialog";
import type { TimetableSlot } from "@/types/schedule";
import type { StudentBuilderCourseItem } from "@/types/studentSchedule";

const item: StudentBuilderCourseItem = {
  itemId: "item-1",
  courseId: "course-1",
  courseCode: "INF-101",
  courseName: "Programación I",
  courseCredits: 4,
  sectionId: "section-1",
  nrc: "12345",
  sectionNumber: 1,
  components: [
    { courseComponentId: "comp-1", courseAssignmentId: "asg-1", componentType: "THEORY" },
  ],
};

function slot(overrides: Partial<TimetableSlot> = {}): TimetableSlot {
  return {
    slotId: "slot-1",
    classroomId: "classroom-1",
    classroomCode: "A-101",
    classroomName: "Aula 101",
    classroomType: "THEORY",
    teacherId: "teacher-1",
    teacherCode: "DOC-01",
    teacherName: "Docente Uno",
    courseId: "course-1",
    courseCode: "INF-101",
    courseName: "Programación I",
    componentType: "THEORY",
    sectionId: "section-1",
    nrc: "12345",
    sectionNumber: 1,
    dayOfWeek: "MONDAY",
    startTime: "07:00:00",
    endTime: "08:30:00",
    ...overrides,
  };
}

describe("StudentBuilderCourseDetailDialog", () => {
  it("renderiza diálogo vacío cuando no hay item", () => {
    render(
      <StudentBuilderCourseDetailDialog
        open
        onOpenChange={vi.fn()}
        item={null}
        slots={[]}
      />,
    );
    expect(screen.queryByText(/INF-101/)).not.toBeInTheDocument();
  });

  it("muestra detalle del curso con bloques y componentes matriculados", () => {
    render(
      <StudentBuilderCourseDetailDialog
        open
        onOpenChange={vi.fn()}
        item={item}
        slots={[slot()]}
      />,
    );

    expect(screen.getByText(/INF-101 · Programación I/)).toBeInTheDocument();
    expect(screen.getAllByText(/NRC 12345/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Docente Uno/)).toBeInTheDocument();
    expect(screen.getByText("A-101")).toBeInTheDocument();
    expect(screen.getByText(/07:00 – 08:30/)).toBeInTheDocument();
    expect(screen.getByText(/componentes matriculados/i)).toBeInTheDocument();
    expect(screen.getByText("Lunes")).toBeInTheDocument();
  });

  it("muestra mensaje sin bloques y usa componentes del item", () => {
    render(
      <StudentBuilderCourseDetailDialog
        open
        onOpenChange={vi.fn()}
        item={item}
        slots={[]}
      />,
    );
    expect(screen.getByText(/sin bloques horarios cargados/i)).toBeInTheDocument();
    expect(screen.getByText("Teoría")).toBeInTheDocument();
  });

  it("permite solicitar quitar el curso en modo edición", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onRequestRemove = vi.fn();

    render(
      <StudentBuilderCourseDetailDialog
        open
        onOpenChange={onOpenChange}
        item={item}
        slots={[slot()]}
        mode="edit"
        onRequestRemove={onRequestRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: /quitar curso/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onRequestRemove).toHaveBeenCalled();
  });

  it("no muestra el botón de quitar en modo readonly", () => {
    render(
      <StudentBuilderCourseDetailDialog
        open
        onOpenChange={vi.fn()}
        item={item}
        slots={[slot()]}
        mode="readonly"
      />,
    );
    expect(screen.queryByRole("button", { name: /quitar curso/i })).not.toBeInTheDocument();
  });
});
