import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentScheduleBuilderScreen from "@/components/schedule/student/StudentScheduleBuilderScreen";
import { I18nProvider } from "@/lib/i18n";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { TimetableSlot } from "@/types/schedule";
import type {
  StudentBuilderDraft,
  StudentMe,
  StudentPendingCourse,
} from "@/types/studentSchedule";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const mutateDraftMock = vi.fn();
const mutateTimetableMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams("periodId=period-1"),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

vi.mock("@/lib/adminApi", () => ({
  adminApi: { listAcademicPeriods: vi.fn(async () => []) },
}));

vi.mock("@/lib/studentScheduleApi", () => ({
  confirmStudentScheduleOption: vi.fn(async () => {}),
  getCurrentStudent: vi.fn(async () => null),
  getStudentAvailableCourses: vi.fn(async () => []),
  getStudentOptionTimetable: vi.fn(async () => []),
  renewStudentScheduleOption: vi.fn(async () => {}),
}));

vi.mock("@/lib/studentScheduleBuilderApi", () => ({
  addStudentBuilderCourse: vi.fn(async () => "item-x"),
  ensureStudentBuilderDraft: vi.fn(async () => "schedule-1"),
  getStudentBuilderDraft: vi.fn(async () => null),
  importStudentBuilderFromOption: vi.fn(async () => "schedule-1"),
  removeStudentBuilderCourse: vi.fn(async () => {}),
  renewStudentBuilderDraft: vi.fn(async () => {}),
}));

const me: StudentMe = {
  id: "student-1",
  userId: "user-1",
  code: "2021-001",
  fullName: "Estudiante Test",
  cycle: 3,
  creditLimit: 22,
  carreraId: "car-1",
  facultadId: "fac-1",
};

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

const draft: StudentBuilderDraft = {
  scheduleId: "schedule-1",
  optionIndex: 1,
  status: "DRAFT",
  draftSource: "MANUAL",
  creditLimit: 22,
  totalCredits: 4,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  secondsRemaining: 300,
  liveDraftCount: 1,
  items: [
    {
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
    },
  ],
};

const pendingCourse: StudentPendingCourse = {
  courseId: "course-2",
  courseCode: "INF-102",
  courseName: "Programación II",
  courseCycle: 2,
  courseCredits: 4,
  courseWeeklyHours: 4,
  requiredComponents: 1,
  prerequisites: [],
  sections: [],
};

const timetable: TimetableSlot[] = [
  {
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
  },
];

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/students/me") {
      return { data: me, isLoading: false, mutate: vi.fn() };
    }
    if (key === "/api/academic-periods") {
      return { data: [period], isLoading: false, mutate: vi.fn() };
    }
    if (key?.startsWith("builder-draft-")) {
      return { data: draft, isLoading: false, mutate: mutateDraftMock };
    }
    if (key?.startsWith("pending-")) {
      return { data: [pendingCourse], isLoading: false, mutate: vi.fn() };
    }
    if (key?.startsWith("builder-timetable-")) {
      return { data: timetable, isLoading: false, mutate: mutateTimetableMock };
    }
    return { data: undefined, isLoading: false, mutate: vi.fn() };
  },
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <StudentScheduleBuilderScreen />
    </I18nProvider>,
  );
}

describe("StudentScheduleBuilderScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la pantalla con período, créditos y hold", async () => {
    renderScreen();

    expect(screen.getByText("Armar horario")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/4 \/ 22/)).toBeInTheDocument();
      expect(screen.getByText(/Hold:/)).toBeInTheDocument();
      expect(screen.getByText(/opciones en uso/)).toBeInTheDocument();
    });
  });

  it("lista cursos disponibles que no están en el borrador", async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText("INF-102")).toBeInTheDocument();
    });
  });

  it("abre el diálogo para agregar un curso disponible", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByText("INF-102")).toBeInTheDocument());
    await user.click(screen.getByText("INF-102"));

    await waitFor(() => {
      expect(screen.getByText(/INF-102 · Programación II/)).toBeInTheDocument();
    });
  });

  it("renueva el hold del borrador", async () => {
    const { renewStudentBuilderDraft } = await import("@/lib/studentScheduleBuilderApi");
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /renovar/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /renovar/i }));

    await waitFor(() => expect(renewStudentBuilderDraft).toHaveBeenCalled());
  });

  it("abre el diálogo de confirmación del horario", async () => {
    const user = userEvent.setup();
    renderScreen();

    const confirmBtn = await screen.findByRole("button", { name: /confirmar horario/i });
    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/¿confirmar este horario\?/i)).toBeInTheDocument();
    });
  });

  it("confirma el horario al aceptar el diálogo", async () => {
    const { confirmStudentScheduleOption } = await import("@/lib/studentScheduleApi");
    const user = userEvent.setup();
    renderScreen();

    const confirmBtn = await screen.findByRole("button", { name: /confirmar horario/i });
    await user.click(confirmBtn);

    const accept = await screen.findByRole("button", { name: /sí, confirmar/i });
    await user.click(accept);

    await waitFor(() => {
      expect(confirmStudentScheduleOption).toHaveBeenCalledWith("student-1", "schedule-1");
      expect(pushMock).toHaveBeenCalledWith("/student/my-schedule?periodId=period-1");
    });
  });

  it("quita un curso desde el detalle de la grilla", async () => {
    const { removeStudentBuilderCourse } = await import("@/lib/studentScheduleBuilderApi");
    const user = userEvent.setup();
    renderScreen();

    const courseCell = await screen.findByText("INF-101");
    await user.click(courseCell);

    const removeBtn = await screen.findByRole("button", { name: /quitar curso/i });
    await user.click(removeBtn);

    const accept = await screen.findByRole("button", { name: /sí, quitar/i });
    await user.click(accept);

    await waitFor(() => {
      expect(removeStudentBuilderCourse).toHaveBeenCalledWith("student-1", "schedule-1", "course-1");
    });
  });

  it("navega a opciones automáticas", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /opciones automáticas/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /opciones automáticas/i }));

    expect(pushMock).toHaveBeenCalledWith("/student/schedule/options?periodId=period-1");
  });
});
