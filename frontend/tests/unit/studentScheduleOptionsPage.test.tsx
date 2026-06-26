import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentScheduleOptionsPage from "@/app/(app)/student/schedule/options/page";
import { I18nProvider } from "@/lib/i18n";
import {
  confirmStudentScheduleOption,
  releaseStudentScheduleOption,
  renewStudentScheduleOption,
} from "@/lib/studentScheduleApi";
import type { AcademicPeriodAdmin, CarreraAdmin } from "@/types/admin";
import type { StudentMe, StudentScheduleOption } from "@/types/studentSchedule";

const pushMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("periodId=period-1&carreraId=car-1"),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

vi.mock("@/lib/studentScheduleApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/studentScheduleApi")>("@/lib/studentScheduleApi");
  return {
    ...actual,
    confirmStudentScheduleOption: vi.fn(),
    releaseStudentScheduleOption: vi.fn(),
    renewStudentScheduleOption: vi.fn(),
    generateStudentScheduleOption: vi.fn(),
    getStudentScheduleOptions: vi.fn(),
    getCurrentStudent: vi.fn(),
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

const carrera: CarreraAdmin = {
  id: "car-1",
  code: "SIS",
  name: "Sistemas",
  facultadId: "fac-1",
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

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

const option: StudentScheduleOption = {
  scheduleId: "schedule-1",
  optionIndex: 1,
  status: "DRAFT",
  createdAt: "2026-05-18T10:00:00Z",
  expiresAt: new Date(Date.now() + 120_000).toISOString(),
  secondsRemaining: 120,
  itemCount: 4,
};

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/students/me") return { data: student, isLoading: false };
    if (key === "/api/academic-periods") return { data: [period], isLoading: false };
    if (key === "/api/catalog/carreras") return { data: [carrera], isLoading: false };
    if (key?.startsWith("student-options-")) {
      return { data: [option], isLoading: false, mutate: mutateMock };
    }
    return { data: undefined, isLoading: false, mutate: mutateMock };
  },
}));

function renderPage() {
  return render(
    <I18nProvider>
      <StudentScheduleOptionsPage />
    </I18nProvider>,
  );
}

describe("StudentScheduleOptionsPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    mutateMock.mockReset();
    vi.mocked(confirmStudentScheduleOption).mockResolvedValue({
      scheduleId: "schedule-1",
      status: "CONFIRMED",
    });
    vi.mocked(releaseStudentScheduleOption).mockResolvedValue(undefined);
    vi.mocked(renewStudentScheduleOption).mockResolvedValue(undefined);
  });

  it("muestra opciones generadas y acciones principales", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Generar mi horario")).toBeInTheDocument();
    });
    expect(screen.getByText(/opción 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generar opción/i })).toBeInTheDocument();
  });

  it("permite abrir el diálogo de confirmación", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));

    expect(screen.getByText(/confirmar este horario/i)).toBeInTheDocument();
  });

  it("confirma una opción y redirige al horario del estudiante", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));
    await user.click(screen.getByRole("button", { name: /sí, confirmar/i }));

    await waitFor(() => {
      expect(confirmStudentScheduleOption).toHaveBeenCalledWith("student-1", "schedule-1");
    });
    expect(pushMock).toHaveBeenCalledWith("/student/my-schedule");
  });

  it("renueva el tiempo de reserva de una opción", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /renovar el tiempo de reserva/i }));

    await waitFor(() => {
      expect(renewStudentScheduleOption).toHaveBeenCalledWith("student-1", "schedule-1");
    });
    expect(mutateMock).toHaveBeenCalled();
  });

  it("descarta una opción tras confirmar en el diálogo", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /descartar esta opción/i }));
    expect(screen.getByText(/descartar esta opción/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /sí, descartar/i }));

    await waitFor(() => {
      expect(releaseStudentScheduleOption).toHaveBeenCalledWith("student-1", "schedule-1");
    });
  });

  it("navega a la vista del horario de la opción", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /ver horario/i }));

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/student/schedule/options/view?scheduleId=schedule-1"),
    );
  });

  it("muestra error de cupo al fallar la confirmación con 409", async () => {
    const user = userEvent.setup();
    const axiosError = new axios.AxiosError("Conflict");
    axiosError.response = {
      status: 409,
      data: { message: "Cupo agotado" },
      headers: {},
      config: {} as never,
      statusText: "Conflict",
    };
    vi.mocked(confirmStudentScheduleOption).mockRejectedValue(axiosError);

    renderPage();

    await waitFor(() => expect(screen.getByText(/opción 1/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));
    await user.click(screen.getByRole("button", { name: /sí, confirmar/i }));

    await waitFor(() => {
      expect(confirmStudentScheduleOption).toHaveBeenCalled();
      expect(mutateMock).toHaveBeenCalled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
