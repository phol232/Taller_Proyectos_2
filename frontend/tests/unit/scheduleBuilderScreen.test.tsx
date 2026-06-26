import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleBuilderScreen from "@/components/schedule/builder/ScheduleBuilderScreen";
import { I18nProvider } from "@/lib/i18n";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { ScheduleOption } from "@/types/schedule";
import type { ScheduleAssignment, ScheduleAssignmentSlot, TimeSlot } from "@/types/scheduleBuilder";

const refreshAssignmentsMock = vi.fn();
const refreshOptionsMock = vi.fn();

const swrState = vi.hoisted(() => ({
  options: null as ScheduleOption[] | null,
}));

vi.mock("@/hooks/useAdminEvents", () => ({
  useAdminEvents: vi.fn(),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

const period: AcademicPeriodAdmin = {
  id: "period-1",
  code: "2026-1",
  name: "Semestre 2026-I",
  startsAt: "2026-03-01",
  endsAt: "2026-07-31",
  status: "PLANNING",
  maxStudentCredits: 22,
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

const draftOption: ScheduleOption = {
  id: "schedule-1",
  academicPeriodId: "period-1",
  status: "DRAFT",
  createdBy: "user-1",
  createdAt: "2026-05-18T10:00:00Z",
  updatedAt: "2026-05-18T10:00:00Z",
  confirmedAt: null,
  solverRunId: "run-1",
  seed: 12345,
  offerCount: 12,
  slotCount: 28,
};

const timeSlot: TimeSlot = {
  id: "slot-1",
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  endTime: "08:30",
  slotOrder: 1,
};

const assignmentSlot: ScheduleAssignmentSlot = {
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
  slots: [assignmentSlot],
};

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/academic-periods") {
      return { data: [period], isLoading: false, mutate: vi.fn() };
    }
    if (key?.includes("schedules/options")) {
      const options = swrState.options ?? [draftOption];
      return { data: options, isLoading: false, mutate: refreshOptionsMock };
    }
    if (key?.startsWith("builder-assignments-")) {
      if ((swrState.options ?? [draftOption]).length === 0) {
        return { data: undefined, isLoading: false, mutate: refreshAssignmentsMock };
      }
      return { data: [assignment], isLoading: false, mutate: refreshAssignmentsMock };
    }
    if (key === "builder-time-slots") {
      return { data: [timeSlot], isLoading: false, mutate: vi.fn() };
    }
    return { data: undefined, isLoading: false, mutate: vi.fn() };
  },
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <ScheduleBuilderScreen />
    </I18nProvider>,
  );
}

describe("ScheduleBuilderScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState.options = null;
  });

  it("renderiza selector de período y horario borrador", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /teoría \+ práctica/i })).toBeInTheDocument();
      expect(screen.getByText(/completas/i)).toBeInTheDocument();
    });
  });

  it("abre el diálogo para agregar un componente", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /un componente/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /un componente/i }));

    expect(screen.getByText(/agregar curso \(un componente\)/i)).toBeInTheDocument();
  });

  it("abre el diálogo para agregar un curso general", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /curso general/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /curso general/i }));

    expect(screen.getByText(/agregar curso general/i)).toBeInTheDocument();
  });

  it("refresca las asignaciones al pulsar actualizar", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /actualizar/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /actualizar/i }));

    expect(refreshAssignmentsMock).toHaveBeenCalled();
  });

  it("muestra mensaje cuando no hay horarios disponibles", async () => {
    swrState.options = [];
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/selecciona un período y un horario/i)).toBeInTheDocument();
    });
  });
});
