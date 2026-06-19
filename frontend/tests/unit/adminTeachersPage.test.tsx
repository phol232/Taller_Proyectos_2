import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeachersPage from "@/app/(app)/admin/teachers/page";
import { I18nProvider } from "@/lib/i18n";
import type { TeacherAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <TeachersPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listTeachers: vi.fn(),
    searchTeachers: vi.fn(),
    createTeacher: vi.fn(),
    updateTeacher: vi.fn(),
    deactivateTeacher: vi.fn(),
    deleteTeacher: vi.fn(),
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
const TEACHER_ID = "a1111111-1111-4111-8111-111111111111";

function sampleTeacher(overrides: Partial<TeacherAdmin> = {}): TeacherAdmin {
  return {
    id: TEACHER_ID,
    userId: null,
    code: "D-001",
    fullName: "Carlos Andrés Pérez",
    email: "carlos.perez@continental.edu.pe",
    specialty: "Matemáticas",
    isActive: true,
    availability: [],
    courseCodes: [],
    courseComponentIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function pagedResult(content: TeacherAdmin[]) {
  return { content, page: 1, pageSize: 12, totalCount: content.length, totalPages: 1 };
}

describe("TeachersPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listTeachers).mockResolvedValue(pagedResult([sampleTeacher()]));
    vi.mocked(adminApi.searchTeachers).mockResolvedValue(pagedResult([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de docentes", async () => {
    renderPage();

    expect(await screen.findByText("Carlos Andrés Pérez")).toBeInTheDocument();
    expect(screen.getByText("D-001")).toBeInTheDocument();
    expect(adminApi.listTeachers).toHaveBeenCalled();
  });

  it("busca docentes por código o nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");

    await user.type(screen.getByPlaceholderText("Buscar por código o nombre…"), "Carlos");

    await waitFor(() => expect(adminApi.searchTeachers).toHaveBeenCalledWith("Carlos", 1));
  });

  it("crea un docente nuevo desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createTeacher).mockResolvedValue(sampleTeacher({ id: "x", code: "D-002" }));
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");

    await user.click(screen.getByRole("button", { name: /Nuevo docente/i }));
    const dialog = await screen.findByRole("dialog");
    const [codeInput, nombresInput, apellidosInput, specialtyInput] = within(dialog).getAllByRole("textbox");
    await user.type(codeInput, "D-002");
    await user.type(nombresInput, "Ana");
    await user.type(apellidosInput, "García");
    await user.type(specialtyInput, "Física");
    await user.click(within(dialog).getByRole("button", { name: "Crear docente" }));

    await waitFor(() => expect(adminApi.createTeacher).toHaveBeenCalled());
  });

  it("edita un docente existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateTeacher).mockResolvedValue(sampleTeacher({ fullName: "Carlos Actualizado" }));
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar docente")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar docente" }));

    await waitFor(() => expect(adminApi.updateTeacher).toHaveBeenCalledWith(TEACHER_ID, expect.anything()));
  });

  it("desactiva un docente tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateTeacher).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateTeacher).toHaveBeenCalledWith(TEACHER_ID));
  });

  it("elimina un docente tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteTeacher).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(adminApi.deleteTeacher).toHaveBeenCalledWith(TEACHER_ID));
  });

  it("filtra por estado inactivo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listTeachers).mockResolvedValue(
      pagedResult([sampleTeacher(), sampleTeacher({ id: "y", code: "D-003", fullName: "Docente Inactivo", isActive: false })])
    );
    renderPage();
    await screen.findByText("Carlos Andrés Pérez");
    expect(screen.getByText("Docente Inactivo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtros/i }));
    await user.click(screen.getByRole("button", { name: /Inactivos/i }));

    await waitFor(() => {
      expect(screen.queryByText("Carlos Andrés Pérez")).not.toBeInTheDocument();
      expect(screen.getByText("Docente Inactivo")).toBeInTheDocument();
    });
  });
});
