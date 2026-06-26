import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import GenerateScheduleScreen from "@/components/schedule/GenerateScheduleScreen";
import { I18nProvider } from "@/lib/i18n";
import type { AcademicPeriodAdmin, CarreraAdmin, ClassroomAdmin } from "@/types/admin";
import type { ScheduleOption } from "@/types/schedule";

const navigationMocks = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.pushMock, replace: navigationMocks.replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/hooks/useAdminEvents", () => ({
  useAdminEvents: vi.fn(),
}));

import { cancelScheduleOption } from "@/lib/scheduleApi";

vi.mock("@/lib/scheduleApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scheduleApi")>("@/lib/scheduleApi");
  return {
    ...actual,
    cancelScheduleOption: vi.fn(),
    generateScheduleOption: vi.fn(),
    getScheduleGenerationRun: vi.fn(),
    getScheduleOptions: vi.fn(),
  };
});

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

const carrera: CarreraAdmin = {
  id: "car-1",
  code: "ING-SIS",
  name: "Ingeniería de Sistemas",
  facultadId: "fac-1",
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

const classroom: ClassroomAdmin = {
  id: "room-1",
  code: "A-101",
  name: "Aula 101",
  type: "CLASSROOM",
  capacity: 40,
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

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/api/academic-periods") {
      return { data: [period], isLoading: false, mutate: vi.fn() };
    }
    if (key === "/api/catalog/carreras") {
      return { data: [carrera], isLoading: false, mutate: vi.fn() };
    }
    if (key === "/api/classrooms?page=1&pageSize=200") {
      return {
        data: { content: [classroom], page: 1, pageSize: 200, totalCount: 1, totalPages: 1 },
        isLoading: false,
        mutate: vi.fn(),
      };
    }
    if (key?.startsWith("/api/schedules/options")) {
      return { data: [draftOption], isLoading: false, mutate: vi.fn() };
    }
    return { data: undefined, isLoading: false, mutate: vi.fn() };
  },
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <GenerateScheduleScreen viewBasePath="/coordinator/schedule/view" />
    </I18nProvider>,
  );
}

async function goToStep4(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByRole("option", { name: /2026-1/i })).toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText("Período académico"), "period-1");
  await user.selectOptions(screen.getByLabelText("Carrera"), "car-1");
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await waitFor(() => expect(screen.getByText(/aulas incluidas/i)).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: /^todas$/i }));
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await waitFor(() => expect(screen.getByText(/resumen de configuración/i)).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: /ver opciones/i }));
  await waitFor(() => expect(screen.getByText("Opciones generadas")).toBeInTheDocument());
}

describe("GenerateScheduleScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el wizard en el paso 1", async () => {
    renderScreen();
    expect(screen.getByText("Período")).toBeInTheDocument();
    expect(screen.getByLabelText("Período académico")).toBeInTheDocument();
    expect(screen.getByLabelText("Carrera")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /2026-1/i })).toBeInTheDocument();
    });
  });

  it("permite avanzar al paso 3 tras seleccionar aulas", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("option", { name: /2026-1/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Período académico"), "period-1");
    await user.selectOptions(screen.getByLabelText("Carrera"), "car-1");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => expect(screen.getByText(/aulas incluidas/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^todas$/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(screen.getByText(/resumen de configuración/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /ver opciones/i }));

    await waitFor(() => {
      expect(screen.getByText("Opciones generadas")).toBeInTheDocument();
    });
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("permite ver detalle de una opción en el paso 4", async () => {
    const user = userEvent.setup();
    navigationMocks.pushMock.mockReset();
    renderScreen();
    await goToStep4(user);

    await user.click(screen.getByRole("button", { name: /ver detalle/i }));
    expect(navigationMocks.pushMock).toHaveBeenCalledWith(
      expect.stringContaining("scheduleId=schedule-1"),
    );
  });

  it("permite eliminar un borrador desde el paso 4", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelScheduleOption).mockResolvedValue(undefined);
    renderScreen();
    await goToStep4(user);

    await user.click(screen.getByRole("button", { name: /eliminar borrador/i }));
    expect(screen.getByText(/se cancelará la opción/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^eliminar$/i }));

    await waitFor(() => {
      expect(cancelScheduleOption).toHaveBeenCalledWith("schedule-1");
    });
  });

  it("cambia el tiempo límite del solver en el paso 1", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /^30s$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^30s$/i }));
    expect(screen.getByRole("button", { name: /^30s$/i })).toHaveClass("bg-[#6B21A8]");
  });

  it("filtra aulas por búsqueda en el paso 2", async () => {
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => expect(screen.getByRole("option", { name: /2026-1/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Período académico"), "period-1");
    await user.selectOptions(screen.getByLabelText("Carrera"), "car-1");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/buscar por código/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/buscar por código/i), "ZZZ");
    expect(screen.getByText(/sin aulas que coincidan/i)).toBeInTheDocument();
  });

  it("vuelve al paso 3 desde el paso 4", async () => {
    const user = userEvent.setup();
    renderScreen();
    await goToStep4(user);

    await user.click(screen.getByRole("button", { name: /volver a configuración/i }));
    await waitFor(() => {
      expect(screen.getByText(/resumen de configuración/i)).toBeInTheDocument();
    });
  });
});
