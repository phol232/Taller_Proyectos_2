import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FacultadesPage from "@/app/(app)/admin/facultades/page";
import { I18nProvider } from "@/lib/i18n";
import type { CarreraAdmin, FacultadAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <FacultadesPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listAllFacultades: vi.fn(),
    listAllCarrerasByFacultad: vi.fn(),
    createFacultad: vi.fn(),
    updateFacultad: vi.fn(),
    deactivateFacultad: vi.fn(),
    deleteFacultad: vi.fn(),
    createCarrera: vi.fn(),
    updateCarrera: vi.fn(),
    deactivateCarrera: vi.fn(),
    deleteCarrera: vi.fn(),
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
const FACULTAD_ID = "a1111111-1111-4111-8111-111111111111";
const CARRERA_ID = "b2222222-2222-4222-8222-222222222222";

function sampleFacultad(overrides: Partial<FacultadAdmin> = {}): FacultadAdmin {
  return {
    id: FACULTAD_ID,
    code: "ING",
    name: "Facultad de Ingeniería",
    isActive: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function sampleCarrera(overrides: Partial<CarreraAdmin> = {}): CarreraAdmin {
  return {
    id: CARRERA_ID,
    facultadId: FACULTAD_ID,
    code: "ING-SIS",
    name: "Ingeniería de Sistemas",
    isActive: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("FacultadesPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listAllFacultades).mockResolvedValue([sampleFacultad()]);
    vi.mocked(adminApi.listAllCarrerasByFacultad).mockResolvedValue([sampleCarrera()]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de facultades", async () => {
    renderPage();

    expect(await screen.findByText("Facultad de Ingeniería")).toBeInTheDocument();
    expect(adminApi.listAllFacultades).toHaveBeenCalled();
  });

  it("crea una facultad nueva desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createFacultad).mockResolvedValue(sampleFacultad({ id: "x", code: "MED", name: "Facultad de Medicina" }));
    renderPage();
    await screen.findByText("Facultad de Ingeniería");

    await user.click(screen.getByRole("button", { name: /Nueva facultad/i }));
    const dialog = await screen.findByRole("dialog");
    const [codeInput, nameInput] = within(dialog).getAllByRole("textbox");
    await user.type(codeInput, "MED");
    await user.type(nameInput, "Facultad de Medicina");
    await user.click(within(dialog).getByRole("button", { name: "Crear facultad" }));

    await waitFor(() => expect(adminApi.createFacultad).toHaveBeenCalledWith({ code: "MED", name: "Facultad de Medicina" }));
  });

  it("edita una facultad existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateFacultad).mockResolvedValue(sampleFacultad({ name: "Actualizada" }));
    renderPage();
    await screen.findByText("Facultad de Ingeniería");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar facultad")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar facultad" }));

    await waitFor(() => expect(adminApi.updateFacultad).toHaveBeenCalledWith(FACULTAD_ID, expect.anything()));
  });

  it("desactiva una facultad tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateFacultad).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Facultad de Ingeniería");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(adminApi.deactivateFacultad).toHaveBeenCalledWith(FACULTAD_ID));
  });

  it("elimina una facultad tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteFacultad).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Facultad de Ingeniería");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(adminApi.deleteFacultad).toHaveBeenCalledWith(FACULTAD_ID));
  });

  it("abre el modal de carreras y crea una carrera nueva", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createCarrera).mockResolvedValue(sampleCarrera({ id: "y", name: "Ingeniería Civil" }));
    renderPage();
    await screen.findByText("Facultad de Ingeniería");

    await user.click(screen.getByRole("button", { name: /Carreras/i }));
    const carrerasDialog = await screen.findByRole("dialog");
    expect(await within(carrerasDialog).findByText("Ingeniería de Sistemas")).toBeInTheDocument();

    await user.click(within(carrerasDialog).getByRole("button", { name: /Nueva carrera/i }));
    const createDialog = await screen.findAllByRole("dialog").then((dialogs) => dialogs[dialogs.length - 1]);
    const nameInput = within(createDialog).getByPlaceholderText("Ej. Ingeniería de Sistemas");
    await user.type(nameInput, "Ingeniería Civil");
    await user.click(within(createDialog).getByRole("button", { name: "Crear carrera" }));

    await waitFor(() => expect(adminApi.createCarrera).toHaveBeenCalledWith({
      facultadId: FACULTAD_ID, code: null, name: "Ingeniería Civil",
    }));
  });
});
