import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import StudentHomePage from "@/app/(app)/student/page";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";

function renderPage() {
  return render(
    <I18nProvider>
      <StudentHomePage />
    </I18nProvider>
  );
}

describe("StudentHomePage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  it("renderiza el saludo con el nombre del usuario", () => {
    useAuthStore.setState({ user: { id: "1", name: "Ana García", email: "ana@continental.edu.pe", role: "student" } });

    renderPage();

    expect(screen.getByText("Hola, Ana")).toBeInTheDocument();
  });

  it("renderiza el saludo fallback sin usuario", () => {
    renderPage();

    expect(screen.getByText("Hola, Estudiante")).toBeInTheDocument();
  });

  it("muestra las tarjetas de información", () => {
    renderPage();

    expect(screen.getByText("Ciclo actual")).toBeInTheDocument();
    expect(screen.getByText("Cursos matriculados")).toBeInTheDocument();
    expect(screen.getByText("Créditos")).toBeInTheDocument();
  });

  it("muestra las acciones rápidas con enlaces", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Mi Horario/i })).toHaveAttribute("href", "/student/my-schedule");
    expect(screen.getByRole("link", { name: /Ver Horarios/i })).toHaveAttribute("href", "/student/schedule/generate");
    expect(screen.getByRole("link", { name: /Armar Horario/i })).toHaveAttribute("href", "/student/schedule/builder");
  });
});
