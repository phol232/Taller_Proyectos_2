import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentOptionTimetablePage from "@/app/(app)/student/schedule/options/view/page";
import { I18nProvider } from "@/lib/i18n";
import type { StudentMe } from "@/types/studentSchedule";
import type { TimetableSlot } from "@/types/schedule";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams("scheduleId=schedule-1&n=1&periodId=period-1&carreraId=car-1"),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

const student: StudentMe = {
  id: "student-1",
  userId: "user-1",
  code: "2021-001",
  fullName: "Estudiante Test",
  cycle: 3,
  creditLimit: 20,
  carreraId: "car-1",
  facultadId: "fac-1",
};

const slots: TimetableSlot[] = [
  {
    slotId: "slot-1",
    classroomId: "classroom-1",
    classroomCode: "A-101",
    classroomName: "Aula 101",
    classroomType: "CLASSROOM",
    teacherId: "teacher-1",
    teacherCode: "DOC-01",
    teacherName: "Docente",
    courseId: "course-1",
    courseCode: "INF-101",
    courseName: "Programación I",
    componentType: "THEORY",
    sectionId: "section-1",
    nrc: "NRC-001",
    sectionNumber: 1,
    dayOfWeek: "MONDAY",
    startTime: "07:00",
    endTime: "08:30",
  },
];

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/students/me") {
      return { data: student, isLoading: false };
    }
    if (key?.startsWith("option-timetable-")) {
      return { data: slots, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  },
}));

describe("StudentOptionTimetablePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("muestra el horario de la opción y acciones de navegación", async () => {
    render(
      <I18nProvider>
        <StudentOptionTimetablePage />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/horario · opción 1/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar este horario/i })).toBeInTheDocument();
  });
});
