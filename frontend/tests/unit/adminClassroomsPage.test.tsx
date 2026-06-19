import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClassroomsPage from "@/app/(app)/admin/classrooms/page";
import { I18nProvider } from "@/lib/i18n";
import type { ClassroomAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <ClassroomsPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listClassrooms: vi.fn(),
    searchClassrooms: vi.fn(),
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deactivateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    findCoursesByCodes: vi.fn().mockResolvedValue([]),
    searchCourses: vi.fn().mockResolvedValue({ content: [], page: 1, pageSize: 8, totalCount: 0, totalPages: 0 }),
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
const CLASSROOM_ID = "a1111111-1111-4111-8111-111111111111";

function sampleClassroom(overrides: Partial<ClassroomAdmin> = {}): ClassroomAdmin {
  return {
    id: CLASSROOM_ID,
    code: "A-101",
    name: "Aula 101",
    capacity: 30,
    type: "LABORATORY",
    isActive: true,
    availability: [],
    courseCodes: [],
    courseComponentIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function pagedResult(content: ClassroomAdmin[]) {
  return { content, page: 1, pageSize: 12, totalCount: content.length, totalPages: 1 };
}

describe("ClassroomsPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listClassrooms).mockResolvedValue(pagedResult([sampleClassroom()]));
    vi.mocked(adminApi.searchClassrooms).mockResolvedValue(pagedResult([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de aulas", async () => {
    renderPage();

    expect(await screen.findByText("Aula 101")).toBeInTheDocument();
    expect(screen.getByText("A-101")).toBeInTheDocument();
    expect(adminApi.listClassrooms).toHaveBeenCalled();
  });

  it("busca aulas por código o nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Aula 101");

    await user.type(screen.getByPlaceholderText("Buscar por código o nombre…"), "101");

    await waitFor(() => expect(adminApi.searchClassrooms).toHaveBeenCalledWith("101", 1));
  });

  it("crea un aula nueva desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createClassroom).mockResolvedValue(sampleClassroom({ id: "x", code: "A-102" }));
    renderPage();
    await screen.findByText("Aula 101");

    await user.click(screen.getByRole("button", { name: /Nueva aula/i }));
    const dialog = await screen.findByRole("dialog");
    const [codeInput, nameInput, typeInput] = within(dialog).getAllByRole("textbox");
    await user.type(codeInput, "A-102");
    await user.type(nameInput, "Aula 102");
    await user.type(typeInput, "LABORATORY");
    await user.click(within(dialog).getByRole("button", { name: "Crear aula" }));

    await waitFor(() => expect(adminApi.createClassroom).toHaveBeenCalled());
  });

  it("edita un aula existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateClassroom).mockResolvedValue(sampleClassroom({ name: "Aula Actualizada" }));
    renderPage();
    await screen.findByText("Aula 101");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar aula")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar aula" }));

    await waitFor(() => expect(adminApi.updateClassroom).toHaveBeenCalledWith(CLASSROOM_ID, expect.anything()));
  });

  it("desactiva un aula tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateClassroom).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Aula 101");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateClassroom).toHaveBeenCalledWith(CLASSROOM_ID));
  });

  it("elimina un aula tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteClassroom).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Aula 101");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(adminApi.deleteClassroom).toHaveBeenCalledWith(CLASSROOM_ID));
  });

  it("filtra por estado inactivo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listClassrooms).mockResolvedValue(
      pagedResult([sampleClassroom(), sampleClassroom({ id: "y", code: "A-103", name: "Aula Inactiva", isActive: false })])
    );
    renderPage();
    await screen.findByText("Aula 101");
    expect(screen.getByText("Aula Inactiva")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtros/i }));
    await user.click(screen.getByRole("button", { name: /Inactivos/i }));

    await waitFor(() => {
      expect(screen.queryByText("Aula 101")).not.toBeInTheDocument();
      expect(screen.getByText("Aula Inactiva")).toBeInTheDocument();
    });
  });
});
