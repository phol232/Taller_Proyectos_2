import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentSchedulePreviewPage from "@/app/(app)/student/schedule/preview/page";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { StudentMe, StudentPendingCourse } from "@/types/studentSchedule";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams("periodId=period-1&courseId=course-1&sectionId=section-1"),
}));

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

const course: StudentPendingCourse = {
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
      nrc: "NRC-001",
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
};

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/students/me") return { data: student, isLoading: false };
    if (key?.startsWith("available-courses-")) {
      return { data: [course], isLoading: false };
    }
    return { data: undefined, isLoading: false };
  },
}));

describe("StudentSchedulePreviewPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("muestra la vista previa de la sección seleccionada", async () => {
    render(<StudentSchedulePreviewPage />);

    await waitFor(() => {
      expect(screen.getByText("INF-101 · Programación I")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /volver/i })).toBeInTheDocument();
  });
});
