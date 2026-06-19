import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CoordinatorHomePage from "@/app/(app)/coordinator/page";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";

function renderPage() {
  return render(
    <I18nProvider>
      <CoordinatorHomePage />
    </I18nProvider>
  );
}

describe("CoordinatorHomePage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  it("renderiza el saludo con el nombre del usuario", () => {
    useAuthStore.setState({ user: { id: "1", name: "Carlos Ruiz", email: "carlos@continental.edu.pe", role: "coordinator" } });

    renderPage();

    expect(screen.getByText("Bienvenido, Carlos")).toBeInTheDocument();
  });

  it("renderiza el saludo fallback sin usuario", () => {
    renderPage();

    expect(screen.getByText("Bienvenido, Coordinador")).toBeInTheDocument();
  });

  it("muestra las tarjetas de estadísticas", () => {
    renderPage();

    expect(screen.getByText("Horarios generados")).toBeInTheDocument();
    expect(screen.getByText("Conflictos detectados")).toBeInTheDocument();
    expect(screen.getByText("Docentes con disponibilidad")).toBeInTheDocument();
    expect(screen.getByText("Ciclo activo")).toBeInTheDocument();
  });

  it("muestra las acciones rápidas con enlaces", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Generar Horario/i })).toHaveAttribute("href", "/coordinator/schedule/generate");
    expect(screen.getByRole("link", { name: /Constructor Manual/i })).toHaveAttribute("href", "/coordinator/schedule/builder");
    expect(screen.getByRole("link", { name: /Confirmar Horario/i })).toHaveAttribute("href", "/coordinator/schedule/confirm");
    expect(screen.getByRole("link", { name: /Disponibilidad Docente/i })).toHaveAttribute("href", "/coordinator/teacher-availability");
  });
});
