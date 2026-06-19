import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoursesPage from "@/app/(app)/admin/courses/page";
import { I18nProvider } from "@/lib/i18n";
import type { CourseAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <CoursesPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listCourses: vi.fn(),
    searchCourses: vi.fn(),
    findCoursesByCodes: vi.fn().mockResolvedValue([]),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deactivateCourse: vi.fn(),
    deleteCourse: vi.fn(),
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

class MockEventSource {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  close = vi.fn();
  constructor(public url: string, public opts?: { withCredentials?: boolean }) {}
}

const { adminApi } = await import("@/lib/adminApi");

const COURSE_ID = "a1111111-1111-4111-8111-111111111111";
const COMPONENT_ID = "b2222222-2222-4222-8222-222222222222";

function sampleCourse(overrides: Partial<CourseAdmin> = {}): CourseAdmin {
  return {
    id: COURSE_ID,
    code: "INF-101",
    name: "Introducción a la Programación",
    cycle: 1,
    credits: 3,
    requiredCredits: 0,
    weeklyHours: 4,
    requiredRoomType: "LABORATORY",
    isActive: true,
    components: [
      { id: COMPONENT_ID, componentType: "GENERAL", weeklyHours: 4, requiredRoomType: "LABORATORY", sortOrder: 1, isActive: true },
    ],
    prerequisites: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function pagedResult(content: CourseAdmin[]) {
  return { content, page: 1, pageSize: 12, totalCount: content.length, totalPages: 1 };
}

describe("CoursesPage (admin)", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    vi.mocked(adminApi.listCourses).mockResolvedValue(pagedResult([sampleCourse()]));
    vi.mocked(adminApi.searchCourses).mockResolvedValue(pagedResult([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de cursos", async () => {
    renderPage();

    expect(await screen.findByText("Introducción a la Programación")).toBeInTheDocument();
    expect(screen.getByText("INF-101")).toBeInTheDocument();
    expect(adminApi.listCourses).toHaveBeenCalled();
  });

  it("busca cursos por código o nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Introducción a la Programación");

    await user.type(screen.getByPlaceholderText("Buscar por código o nombre…"), "INF");

    await waitFor(() => expect(adminApi.searchCourses).toHaveBeenCalledWith("INF", 1));
  });

  it("crea un curso nuevo desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createCourse).mockResolvedValue(sampleCourse({ id: "33333333-3333-3333-3333-333333333333", code: "INF-102", name: "Estructuras de Datos" }));
    renderPage();
    await screen.findByText("Introducción a la Programación");

    await user.click(screen.getByRole("button", { name: /Nuevo curso/i }));
    const dialog = await screen.findByRole("dialog");
    const [codeInput, nameInput, roomTypeInput] = within(dialog).getAllByRole("textbox");
    await user.type(codeInput, "INF-102");
    await user.type(nameInput, "Estructuras de Datos");
    await user.type(roomTypeInput, "LABORATORY");
    await user.click(within(dialog).getByRole("button", { name: "Crear curso" }));

    await waitFor(() => expect(adminApi.createCourse).toHaveBeenCalled());
  });

  it("edita un curso existente", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.updateCourse).mockResolvedValue(sampleCourse({ name: "Nombre Actualizado" }));
    renderPage();
    await screen.findByText("Introducción a la Programación");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar curso")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar curso" }));

    await waitFor(() => expect(adminApi.updateCourse).toHaveBeenCalledWith(COURSE_ID, expect.anything()));
  });

  it("desactiva un curso tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateCourse).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Introducción a la Programación");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateCourse).toHaveBeenCalledWith(COURSE_ID));
  });

  it("elimina un curso tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteCourse).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Introducción a la Programación");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(adminApi.deleteCourse).toHaveBeenCalledWith(COURSE_ID));
  });

  it("muestra el filtro de aula y estado, y aplica filtro de estado inactivo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listCourses).mockResolvedValue(
      pagedResult([sampleCourse(), sampleCourse({ id: "44444444-4444-4444-4444-444444444444", code: "INF-103", name: "Curso Inactivo", isActive: false })])
    );
    renderPage();
    await screen.findByText("Introducción a la Programación");
    expect(screen.getByText("Curso Inactivo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtros/i }));
    await user.click(screen.getByRole("button", { name: /Inactivos/i }));

    await waitFor(() => {
      expect(screen.queryByText("Introducción a la Programación")).not.toBeInTheDocument();
      expect(screen.getByText("Curso Inactivo")).toBeInTheDocument();
    });
  });
});
