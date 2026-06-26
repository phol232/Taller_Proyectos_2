import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import TeacherAvailabilityPage from "@/app/(app)/coordinator/teacher-availability/page";
import SchedulesViewPage from "@/app/(app)/schedules/view/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("swr", () => ({
  default: () => ({ data: undefined, isLoading: false, mutate: vi.fn() }),
}));

vi.mock("@/components/schedule/student/StudentScheduleBuilderScreen", () => ({
  default: () => <div data-testid="student-builder-screen" />,
}));

import MySchedulePage from "@/app/(app)/student/my-schedule/page";
import StudentBuilderPage from "@/app/(app)/student/schedule/builder/page";

function renderWithI18n(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("subpáginas estudiante", () => {
  it("my-schedule muestra selector de período", () => {
    renderWithI18n(<MySchedulePage />);
    expect(screen.getByText(/Mi horario/i)).toBeInTheDocument();
    expect(screen.getByText(/Período académico/i)).toBeInTheDocument();
  });

  it("student builder delega en StudentScheduleBuilderScreen", () => {
    renderWithI18n(<StudentBuilderPage />);
    expect(screen.getByTestId("student-builder-screen")).toBeInTheDocument();
  });
});

describe("subpáginas en construcción", () => {
  it("teacher-availability muestra módulo en construcción", () => {
    renderWithI18n(<TeacherAvailabilityPage />);
    expect(screen.getByText(/módulo en construcción/i)).toBeInTheDocument();
  });

  it("schedules/view muestra mensaje de fase", () => {
    renderWithI18n(<SchedulesViewPage />);
    expect(screen.getByText(/fase 3/i)).toBeInTheDocument();
  });
});
