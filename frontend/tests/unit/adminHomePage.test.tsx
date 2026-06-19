import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminHomePage from "@/app/(app)/admin/page";
import { I18nProvider } from "@/lib/i18n";

const adminApiMock = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listStudents: vi.fn(),
  listTeachers: vi.fn(),
  listCourses: vi.fn(),
  listClassrooms: vi.fn(),
  listAllFacultades: vi.fn(),
  listAcademicPeriods: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => ({ adminApi: adminApiMock }));

function renderPage() {
  return render(
    <I18nProvider>
      <AdminHomePage />
    </I18nProvider>
  );
}

describe("AdminHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApiMock.listUsers.mockResolvedValue({ totalCount: 12 });
    adminApiMock.listStudents.mockResolvedValue({ totalCount: 340 });
    adminApiMock.listTeachers.mockResolvedValue({ totalCount: 45 });
    adminApiMock.listCourses.mockResolvedValue({ totalCount: 78 });
    adminApiMock.listClassrooms.mockResolvedValue({ totalCount: 24 });
    adminApiMock.listAllFacultades.mockResolvedValue([
      { id: "f1", code: "ING", name: "Ingeniería", isActive: true },
      { id: "f2", code: "ADM", name: "Administración", isActive: false },
    ]);
    adminApiMock.listAcademicPeriods.mockResolvedValue([
      {
        id: "p1",
        code: "2025-I",
        name: "Ciclo 2025-I",
        startsAt: "2025-03-01",
        endsAt: "2025-07-15",
        status: "ACTIVE",
        maxStudentCredits: 22,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el título y descripción del panel", () => {
    renderPage();

    expect(screen.getByText("Panel de Administración")).toBeInTheDocument();
  });

  it("carga y muestra las estadísticas", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument());
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("muestra skeleton mientras carga", () => {
    renderPage();

    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra el período activo con sus fechas", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Ciclo 2025-I")).toBeInTheDocument());
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("22 cr.")).toBeInTheDocument();
  });

  it("renderiza los enlaces a módulos de gestión", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Gestión de Estudiantes")).toBeInTheDocument());

    expect(screen.getByRole("link", { name: /Gestión de Estudiantes/i })).toHaveAttribute("href", "/admin/students");
    expect(screen.getByRole("link", { name: /Gestión de Docentes/i })).toHaveAttribute("href", "/admin/teachers");
    expect(screen.getByRole("link", { name: /Catálogo de Cursos/i })).toHaveAttribute("href", "/admin/courses");
  });

  it("maneja errores de carga mostrando el estado vacío", async () => {
    adminApiMock.listAcademicPeriods.mockRejectedValue(new Error("Network error"));

    renderPage();

    await waitFor(() => expect(screen.queryAllByRole("status")).toHaveLength(0));
    expect(screen.getByText("Sin período configurado")).toBeInTheDocument();
  });
});
