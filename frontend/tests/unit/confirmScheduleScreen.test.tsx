import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ConfirmScheduleScreen from "@/components/schedule/ConfirmScheduleScreen";
import { I18nProvider } from "@/lib/i18n";
import { adminApi } from "@/lib/adminApi";
import { confirmScheduleOption, getScheduleOptions } from "@/lib/scheduleApi";
import { toastSuccess } from "@/lib/utils";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import type { AcademicPeriodAdmin } from "@/types/admin";
import type { ScheduleOption } from "@/types/schedule";

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
      listAcademicPeriods: vi.fn(),
    },
  };
});

vi.mock("@/lib/scheduleApi", () => ({
  confirmScheduleOption: vi.fn(),
  getScheduleOptions: vi.fn(),
}));

vi.mock("@/hooks/useAdminEvents", () => ({
  useAdminEvents: vi.fn(),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return {
    ...actual,
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  };
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
  id: "schedule-draft",
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

const confirmedOption: ScheduleOption = {
  ...draftOption,
  id: "schedule-confirmed",
  status: "CONFIRMED",
  confirmedAt: "2026-05-18T12:00:00Z",
};

function renderScreen() {
  return render(
    <I18nProvider>
      <ConfirmScheduleScreen role="admin" />
    </I18nProvider>,
  );
}

describe("ConfirmScheduleScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAcademicPeriods).mockResolvedValue([period]);
    vi.mocked(getScheduleOptions).mockResolvedValue([confirmedOption, draftOption]);
    vi.mocked(confirmScheduleOption).mockResolvedValue({
      scheduleId: "schedule-draft",
      status: "CONFIRMED",
    });
  });

  it("muestra el horario confirmado y los borradores disponibles", async () => {
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Confirmar Horario" })).toBeInTheDocument();
    expect(useAdminEvents).toHaveBeenCalledWith("schedules.changed", expect.any(Function));
    expect(await screen.findByText("Horario confirmado")).toBeInTheDocument();
    expect(screen.getByText("Opción 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Vista previa/i })).toHaveAttribute(
      "href",
      "/admin/schedule/view?scheduleId=schedule-draft",
    );
  });

  it("confirma un borrador y refresca las opciones", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar y publicar" }));

    await waitFor(() => expect(confirmScheduleOption).toHaveBeenCalledWith("schedule-draft"));
    expect(toastSuccess).toHaveBeenCalledWith(
      "Horario confirmado",
      "Los demás borradores fueron cancelados y los estudiantes podrán ver los cursos disponibles.",
    );
  });
});
