import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RoleGuard from "@/components/shared/RoleGuard";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/entities";

function renderGuard(children: React.ReactNode, allowedRoles: Role[]) {
  return render(
    <I18nProvider>
      <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard>
    </I18nProvider>
  );
}

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("RoleGuard", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false, _hasHydrated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false, _hasHydrated: false });
  });

  it("no renderiza nada mientras no se hidrata el store", () => {
    const { container } = renderGuard(<p>contenido</p>, ["admin"]);

    expect(container).toBeEmptyDOMElement();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirige a /login cuando hidrató y no hay sesión", () => {
    useAuthStore.setState({ _hasHydrated: true, isAuthenticated: false });

    renderGuard(<p>contenido</p>, ["admin"]);

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("muestra acceso denegado si el rol no está permitido", () => {
    useAuthStore.setState({ _hasHydrated: true, isAuthenticated: true, role: "student" });

    renderGuard(<p>contenido</p>, ["admin"]);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });

  it("renderiza el contenido cuando el rol está permitido", () => {
    useAuthStore.setState({ _hasHydrated: true, isAuthenticated: true, role: "admin" });

    renderGuard(<p>contenido</p>, ["admin"]);

    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});
