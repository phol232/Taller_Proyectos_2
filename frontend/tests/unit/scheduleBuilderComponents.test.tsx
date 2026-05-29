import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { adminApi } from "@/lib/adminApi";
import {
  addCourseAssignment,
  getScheduleAssignments,
  getTimeSlots,
  validateSlot,
} from "@/lib/scheduleBuilderApi";
import AddCourseDialog from "@/components/schedule/builder/AddCourseDialog";
import ClassroomMatrixView from "@/components/schedule/builder/ClassroomMatrixView";
import ModeSelectorDialog from "@/components/schedule/builder/ModeSelectorDialog";
import SlotDetailDialog from "@/components/schedule/builder/SlotDetailDialog";
import type { ClassroomAdmin, CourseAdmin, PagedResult, TeacherAdmin } from "@/types/admin";
import type {
  ScheduleAssignment,
  ScheduleAssignmentSlot,
  TimeSlot,
} from "@/types/scheduleBuilder";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/adminApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adminApi")>("@/lib/adminApi");
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      listCourses: vi.fn(),
      searchTeachers: vi.fn(),
      listClassrooms: vi.fn(),
      searchClassrooms: vi.fn(),
    },
  };
});

vi.mock("@/lib/scheduleBuilderApi", () => ({
  addCourseAssignment: vi.fn(),
  getScheduleAssignments: vi.fn(),
  getTimeSlots: vi.fn(),
  validateSlot: vi.fn(),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return {
    ...actual,
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  };
});

const timeSlot: TimeSlot = {
  id: "slot-1",
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  endTime: "08:30",
  slotOrder: 1,
};

const slot: ScheduleAssignmentSlot = {
  slotId: "assignment-slot-1",
  timeSlotId: "slot-1",
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  endTime: "08:30",
  classroomId: "classroom-1",
  classroomCode: "A-101",
  classroomName: "Aula 101",
};

const assignment: ScheduleAssignment = {
  assignmentId: "assignment-1",
  courseId: "course-1",
  courseCode: "INF-101",
  courseName: "Programación",
  courseComponentId: "component-theory",
  componentType: "THEORY",
  componentWeeklyHours: 1.5,
  teacherId: "teacher-1",
  teacherCode: "DOC-1",
  teacherName: "Ana Docente",
  sectionId: null,
  sectionNrc: "12345",
  assignmentStatus: "DRAFT",
  assignedHours: 1.5,
  complete: true,
  slots: [slot],
};

const course: CourseAdmin = {
  id: "course-1",
  code: "INF-101",
  name: "Programación",
  cycle: 1,
  credits: 4,
  requiredCredits: 0,
  weeklyHours: 1.5,
  requiredRoomType: "Aula",
  isActive: true,
  components: [
    {
      id: "component-theory",
      componentType: "THEORY",
      weeklyHours: 1.5,
      requiredRoomType: "Aula",
      sortOrder: 1,
      isActive: true,
    },
  ],
  prerequisites: [],
  createdAt: null,
  updatedAt: null,
};

const teacher: TeacherAdmin = {
  id: "teacher-1",
  userId: null,
  code: "DOC-1",
  fullName: "Ana Docente",
  email: null,
  specialty: "Software",
  isActive: true,
  availability: [{ day: "MONDAY", startTime: "07:00", endTime: "08:30", available: true }],
  courseCodes: ["INF-101"],
  courseComponentIds: ["component-theory"],
  createdAt: null,
  updatedAt: null,
};

const classroom: ClassroomAdmin = {
  id: "classroom-1",
  code: "A-101",
  name: "Aula 101",
  capacity: 35,
  type: "Aula",
  isActive: true,
  availability: [],
  courseCodes: [],
  courseComponentIds: [],
  createdAt: null,
  updatedAt: null,
};

function page<T>(content: T[]): PagedResult<T> {
  return {
    content,
    page: 1,
    pageSize: 30,
    totalCount: content.length,
    totalPages: 1,
  };
}

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("componentes del constructor de horarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listCourses).mockResolvedValue(page([course]));
    vi.mocked(adminApi.searchTeachers).mockResolvedValue(page([teacher]));
    vi.mocked(adminApi.listClassrooms).mockResolvedValue(page([classroom]));
    vi.mocked(adminApi.searchClassrooms).mockResolvedValue(page([classroom]));
    vi.mocked(getTimeSlots).mockResolvedValue([timeSlot]);
    vi.mocked(getScheduleAssignments).mockResolvedValue([]);
    vi.mocked(validateSlot).mockResolvedValue([]);
    vi.mocked(addCourseAssignment).mockResolvedValue({ assignmentId: "assignment-1" });
  });

  it("ModeSelectorDialog traduce las opciones especiales a modo y componente", async () => {
    const onPick = vi.fn();

    render(
      <ModeSelectorDialog
        open
        onOpenChange={vi.fn()}
        onPick={onPick}
        contextLabel="Lunes · 07:00-08:30 · aula A-101"
      />,
    );

    expect(screen.getByText(/Destino: Lunes/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Sesión de teoría/i }));
    await userEvent.click(screen.getByRole("button", { name: /Sesión de práctica/i }));
    await userEvent.click(screen.getByRole("button", { name: /Curso completo/i }));

    expect(onPick).toHaveBeenNthCalledWith(1, "FULL", "THEORY");
    expect(onPick).toHaveBeenNthCalledWith(2, "FULL", "PRACTICE");
    expect(onPick).toHaveBeenNthCalledWith(3, "FULL_BOTH");
  });

  it("ClassroomMatrixView muestra asignaciones y permite abrir celdas ocupadas y vacías", async () => {
    const onSlotClick = vi.fn();
    const onEmptyCellClick = vi.fn();

    render(
      <ClassroomMatrixView
        assignments={[assignment]}
        timeSlots={[
          timeSlot,
          {
            id: "slot-2",
            dayOfWeek: "TUESDAY",
            startTime: "07:00",
            endTime: "08:30",
            slotOrder: 2,
          },
        ]}
        onSlotClick={onSlotClick}
        onEmptyCellClick={onEmptyCellClick}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /INF-101/i }));
    await userEvent.click(screen.getByRole("button", {
      name: /Asignar curso · Martes 07:00-08:30 en A-101/i,
    }));

    expect(onSlotClick).toHaveBeenCalledWith(assignment, slot);
    expect(onEmptyCellClick).toHaveBeenCalledWith(
      "TUESDAY",
      expect.objectContaining({ id: "slot-2" }),
      expect.objectContaining({ id: "classroom-1" }),
    );
  });

  it("SlotDetailDialog pide confirmación cuando quitar la franja deja incompleta la asignación", async () => {
    const onRemoveAssignment = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(
      <SlotDetailDialog
        open
        onOpenChange={vi.fn()}
        assignment={assignment}
        slot={slot}
        removing={false}
        onRemoveSlotOnly={vi.fn().mockResolvedValue(undefined)}
        onRemoveAssignment={onRemoveAssignment}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Quitar franja/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Eliminar asignación completa/i }));

    expect(onRemoveAssignment).toHaveBeenCalledTimes(1);
  });

  it("AddCourseDialog agrega un componente con docente, aula y franja seleccionada", async () => {
    const onAdded = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AddCourseDialog
        open
        onOpenChange={onOpenChange}
        scheduleId="schedule-1"
        mode="FULL"
        onAdded={onAdded}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { name: /INF-101 · Programación/i }));
    const theoryButton = screen.getByText("Teoría").closest("button");
    expect(theoryButton).not.toBeNull();
    await userEvent.click(theoryButton!);

    await userEvent.type(screen.getByPlaceholderText(/Buscar docente/i), "Ana");
    await userEvent.click(await screen.findByRole("button", { name: /Ana Docente/i }));
    await userEvent.click(await screen.findByRole("button", { name: /A-101/i }));
    await userEvent.click(await screen.findByRole("button", { name: /07:00/i }));
    await userEvent.click(screen.getByRole("button", { name: /Confirmar y agregar/i }));

    await waitFor(() => expect(validateSlot).toHaveBeenCalledWith("schedule-1", {
      assignmentId: null,
      teacherId: "teacher-1",
      classroomId: "classroom-1",
      timeSlotId: "slot-1",
      startTime: "07:00",
      endTime: "08:30",
      excludeSlotId: null,
    }));
    expect(addCourseAssignment).toHaveBeenCalledWith("schedule-1", {
      courseComponentId: "component-theory",
      teacherId: "teacher-1",
      slots: [
        {
          classroomId: "classroom-1",
          timeSlotId: "slot-1",
          startTime: "07:00",
          endTime: "08:30",
        },
      ],
    });
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
