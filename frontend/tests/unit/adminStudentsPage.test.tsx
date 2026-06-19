import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentsPage from "@/app/(app)/admin/students/page";
import { I18nProvider } from "@/lib/i18n";
import type { StudentAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <StudentsPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listStudents: vi.fn(),
    searchStudents: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    deactivateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    findCoursesByCodes: vi.fn().mockResolvedValue([]),
    searchCourses: vi.fn().mockResolvedValue({ content: [], page: 1, pageSize: 8, totalCount: 0, totalPages: 0 }),
    listCatalogFacultades: vi.fn().mockResolvedValue([]),
    listCatalogCarreras: vi.fn().mockResolvedValue([]),
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
const STUDENT_ID = "a1111111-1111-4111-8111-111111111111";

function sampleStudent(overrides: Partial<StudentAdmin> = {}): StudentAdmin {
  return {
    id: STUDENT_ID,
    userId: null,
    code: "E-001",
    fullName: "Ana María García",
    email: "ana.garcia@continental.edu.pe",
    cycle: 3,
    career: "Ingeniería de Software",
    facultadId: null,
    carreraId: null,
    creditLimit: 22,
    isActive: true,
    approvedCourses: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function pagedResult(content: StudentAdmin[]) {
  return { content, page: 1, pageSize: 12, totalCount: content.length, totalPages: 1 };
}

describe("StudentsPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listStudents).mockResolvedValue(pagedResult([sampleStudent()]));
    vi.mocked(adminApi.searchStudents).mockResolvedValue(pagedResult([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de estudiantes", async () => {
    renderPage();

    expect(await screen.findByText("Ana María García")).toBeInTheDocument();
    expect(screen.getByText("E-001")).toBeInTheDocument();
    expect(adminApi.listStudents).toHaveBeenCalled();
  });

  it("busca estudiantes por código o nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana María García");

    await user.type(screen.getByPlaceholderText("Buscar por código o nombre…"), "Ana");

    await waitFor(() => expect(adminApi.searchStudents).toHaveBeenCalledWith("Ana", 1));
  });

  it("crea un estudiante nuevo desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createStudent).mockResolvedValue(sampleStudent({ id: "x", code: "E-002" }));
    renderPage();
    await screen.findByText("Ana María García");

    await user.click(screen.getByRole("button", { name: /Nuevo estudiante/i }));
    const dialog = await screen.findByRole("dialog");
    const [codeInput, nombresInput, apellidosInput] = within(dialog).getAllByRole("textbox");
    await user.type(codeInput, "E-002");
    await user.type(nombresInput, "Luis");
    await user.type(apellidosInput, "Torres");
    await user.click(within(dialog).getByRole("button", { name: "Crear estudiante" }));

    await waitFor(() => expect(adminApi.createStudent).toHaveBeenCalled());
  });

  it("edita un estudiante existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateStudent).mockResolvedValue(sampleStudent({ fullName: "Ana Actualizada" }));
    renderPage();
    await screen.findByText("Ana María García");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar estudiante")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar estudiante" }));

    await waitFor(() => expect(adminApi.updateStudent).toHaveBeenCalledWith(STUDENT_ID, expect.anything()));
  });

  it("desactiva un estudiante tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateStudent).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Ana María García");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateStudent).toHaveBeenCalledWith(STUDENT_ID));
  });

  it("elimina un estudiante tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteStudent).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Ana María García");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(adminApi.deleteStudent).toHaveBeenCalledWith(STUDENT_ID));
  });

  it("filtra por estado inactivo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listStudents).mockResolvedValue(
      pagedResult([sampleStudent(), sampleStudent({ id: "y", code: "E-003", fullName: "Estudiante Inactivo Torres", isActive: false })])
    );
    renderPage();
    await screen.findByText("Ana María García");
    expect(screen.getByText("Estudiante Inactivo Torres")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtros/i }));
    await user.click(screen.getByRole("button", { name: /Inactivos/i }));

    await waitFor(() => {
      expect(screen.queryByText("Ana María García")).not.toBeInTheDocument();
      expect(screen.getByText("Estudiante Inactivo Torres")).toBeInTheDocument();
    });
  });
});
