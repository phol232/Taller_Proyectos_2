import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddStudentCourseDialog from "@/components/schedule/student/AddStudentCourseDialog";
import type { Conflict } from "@/types/schedule";
import type { StudentPendingCourse } from "@/types/studentSchedule";

const validateMock = vi.fn<(args: unknown) => Conflict[]>(() => []);

vi.mock("@/hooks/useScheduleValidation", () => ({
  useScheduleValidation: () => ({ validate: validateMock }),
}));

const validateServerMock = vi.fn(async () => [] as Conflict[]);

vi.mock("@/lib/studentScheduleBuilderApi", () => ({
  validateStudentBuilderCourse: (...args: unknown[]) => validateServerMock(...(args as [])),
}));

function buildCourse(overrides: Partial<StudentPendingCourse> = {}): StudentPendingCourse {
  return {
    courseId: "course-1",
    courseCode: "INF-101",
    courseName: "Programación I",
    courseCycle: 1,
    courseCredits: 4,
    courseWeeklyHours: 4,
    requiredComponents: 1,
    prerequisites: [],
    sections: [
      {
        sectionId: "section-1",
        nrc: "12345",
        sectionNumber: 1,
        availableVacancies: 10,
        components: [
          {
            assignmentId: "assignment-1",
            courseComponentId: "component-1",
            componentType: "THEORY",
            componentWeeklyHours: 4,
            teacherId: "teacher-1",
            teacherCode: "DOC-01",
            teacherName: "Docente Uno",
            slots: [
              {
                slotId: "slot-1",
                timeSlotId: "timeslot-1",
                dayOfWeek: "MONDAY",
                startTime: "07:00",
                endTime: "08:30",
                classroomId: "classroom-1",
                classroomCode: "A-101",
                classroomName: "Aula 101",
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  studentId: "student-1",
  scheduleId: "schedule-1",
  creditLimit: 22,
  currentTotalCredits: 0,
  currentAssignments: [],
  approvedCourseIds: [],
  onAdded: vi.fn(),
  onConfirmAdd: vi.fn(async () => {}),
};

describe("AddStudentCourseDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateMock.mockReturnValue([]);
    validateServerMock.mockResolvedValue([]);
  });

  it("no renderiza nada cuando no hay curso", () => {
    const { container } = render(
      <AddStudentCourseDialog {...baseProps} course={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra título, secciones y permite agregar al horario", async () => {
    const user = userEvent.setup();
    const onConfirmAdd = vi.fn(async () => {});
    const onAdded = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AddStudentCourseDialog
        {...baseProps}
        course={buildCourse()}
        onConfirmAdd={onConfirmAdd}
        onAdded={onAdded}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByText(/INF-101 · Programación I/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio"));
    await waitFor(() => expect(validateServerMock).toHaveBeenCalled());

    const addBtn = screen.getByRole("button", { name: /agregar al horario/i });
    await waitFor(() => expect(addBtn).toBeEnabled());
    await user.click(addBtn);

    await waitFor(() => {
      expect(onConfirmAdd).toHaveBeenCalledWith("course-1", ["assignment-1"]);
      expect(onAdded).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("muestra mensaje cuando no hay secciones publicadas", () => {
    render(
      <AddStudentCourseDialog
        {...baseProps}
        course={buildCourse({ sections: [] })}
      />,
    );
    expect(screen.getByText(/no hay secciones publicadas/i)).toBeInTheDocument();
  });

  it("advierte prerrequisitos faltantes y bloquea el botón", () => {
    render(
      <AddStudentCourseDialog
        {...baseProps}
        course={buildCourse({
          prerequisites: [
            { prerequisiteCourseId: "c0", prerequisiteCode: "INF-100", isSatisfied: false },
          ],
        })}
      />,
    );
    expect(screen.getByText(/prerrequisitos faltantes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar al horario/i })).toBeDisabled();
  });

  it("muestra conflictos detectados y no permite agregar", async () => {
    const user = userEvent.setup();
    validateMock.mockReturnValue([
      { type: "credits_exceeded", message: "Supera el límite de créditos" },
    ]);

    render(<AddStudentCourseDialog {...baseProps} course={buildCourse()} />);

    await user.click(screen.getByRole("radio"));

    await waitFor(() => {
      expect(screen.getByText(/supera el límite de créditos/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /agregar al horario/i })).toBeDisabled();
  });

  it("cierra el diálogo al cancelar", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AddStudentCourseDialog
        {...baseProps}
        course={buildCourse()}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
