import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoordinatorScheduleViewPage from "@/app/(app)/coordinator/schedule/view/page";
import AdminScheduleViewPage from "@/app/(app)/admin/schedule/view/page";
import type { TimetableSlot } from "@/types/schedule";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("scheduleId=schedule-1"),
}));

const slots: TimetableSlot[] = [
  {
    slotId: "slot-1",
    classroomId: "classroom-1",
    classroomCode: "A-101",
    classroomName: "Aula 101",
    classroomType: "CLASSROOM",
    teacherId: "teacher-1",
    teacherCode: "DOC-01",
    teacherName: "Docente Uno",
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
    if (key?.startsWith("timetable-")) {
      return { data: slots, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  },
}));

describe("CoordinatorScheduleViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra la grilla del horario y filtros (coordinator)", async () => {
    render(<CoordinatorScheduleViewPage />);

    await waitFor(() => {
      expect(screen.getByText("Vista de horario")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/buscar curso/i)).toBeInTheDocument();
    expect(screen.getByText("INF-101")).toBeInTheDocument();
    expect(screen.getByText("Docente Uno")).toBeInTheDocument();
  });

  it("muestra la grilla del horario y filtros (admin)", async () => {
    render(<AdminScheduleViewPage />);

    await waitFor(() => {
      expect(screen.getByText("Vista de horario")).toBeInTheDocument();
    });
    expect(screen.getByText("INF-101")).toBeInTheDocument();
  });

  it("filtra bloques por búsqueda", async () => {
    const user = userEvent.setup();
    render(<CoordinatorScheduleViewPage />);

    await waitFor(() => expect(screen.getByText("INF-101")).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText(/buscar curso/i), "MAT-999");
    expect(screen.queryByText("INF-101")).not.toBeInTheDocument();
  });
});
