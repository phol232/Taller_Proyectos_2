import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AcademicPeriodsPage from "@/app/(app)/admin/academic-periods/page";
import { I18nProvider } from "@/lib/i18n";
import type { AcademicPeriodAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <AcademicPeriodsPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listAcademicPeriods: vi.fn(),
    searchAcademicPeriods: vi.fn(),
    createAcademicPeriod: vi.fn(),
    updateAcademicPeriod: vi.fn(),
    activateAcademicPeriod: vi.fn(),
    deactivateAcademicPeriod: vi.fn(),
    deleteAcademicPeriod: vi.fn(),
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

class MockEventSource {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  close = vi.fn();
  constructor(public url: string) {}
}

const { adminApi } = await import("@/lib/adminApi");
const PERIOD_ID = "a1111111-1111-4111-8111-111111111111";

function samplePeriod(overrides: Partial<AcademicPeriodAdmin> = {}): AcademicPeriodAdmin {
  return {
    id: PERIOD_ID,
    code: "2026-1",
    name: "2026 - Semestre 1",
    startsAt: "2026-03-15",
    endsAt: "2026-07-30",
    status: "ACTIVE",
    maxStudentCredits: 22,
    isActive: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("AcademicPeriodsPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listAcademicPeriods).mockResolvedValue([samplePeriod()]);
    vi.mocked(adminApi.searchAcademicPeriods).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de períodos académicos", async () => {
    renderPage();

    expect(await screen.findByText("2026 - Semestre 1")).toBeInTheDocument();
    expect(adminApi.listAcademicPeriods).toHaveBeenCalled();
  });

  it("busca períodos por código o nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2026 - Semestre 1");

    await user.type(screen.getByPlaceholderText("Buscar..."), "2026");

    await waitFor(() => expect(adminApi.searchAcademicPeriods).toHaveBeenCalledWith("2026"));
  });

  it("edita un período existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateAcademicPeriod).mockResolvedValue(samplePeriod({ name: "Actualizado" }));
    renderPage();
    await screen.findByText("2026 - Semestre 1");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar período académico")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /Guardar|Actualizar/i }));

    await waitFor(() => expect(adminApi.updateAcademicPeriod).toHaveBeenCalledWith(PERIOD_ID, expect.anything()));
  });

  it("desactiva un período tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateAcademicPeriod).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("2026 - Semestre 1");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateAcademicPeriod).toHaveBeenCalledWith(PERIOD_ID));
  });

  it("activa un período inactivo tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listAcademicPeriods).mockResolvedValue([samplePeriod({ isActive: false })]);
    vi.mocked(adminApi.activateAcademicPeriod).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("2026 - Semestre 1");

    await user.click(screen.getByRole("button", { name: "Activar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(adminApi.activateAcademicPeriod).toHaveBeenCalledWith(PERIOD_ID));
  });

  it("elimina un período tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteAcademicPeriod).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("2026 - Semestre 1");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(adminApi.deleteAcademicPeriod).toHaveBeenCalledWith(PERIOD_ID));
  });
});
