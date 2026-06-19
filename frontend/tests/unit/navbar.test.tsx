import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "@/components/layout/Navbar";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useUiStore } from "@/store/ui.store";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}));

const { default: api } = await import("@/lib/api");

function renderNavbar() {
  return render(
    <I18nProvider>
      <Navbar />
    </I18nProvider>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: "1", name: "Ana García", email: "ana@continental.edu.pe", role: "admin" },
      role: "admin",
      isAuthenticated: true,
    });
    useUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    useNotificationStore.setState({
      systemNotifications: [
        { id: "welcome", kind: "welcome", read: false },
        { id: "security", kind: "security", read: true },
      ],
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    useUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    vi.unstubAllGlobals();
  });

  it("renderiza las iniciales del usuario", () => {
    renderNavbar();

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("alterna el sidebar al hacer click", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", () => ({ matches: true } as MediaQueryList));
    renderNavbar();

    await user.click(screen.getByLabelText(/Colapsar menú|Expandir menú/i));

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it("muestra el contador de notificaciones no leídas", () => {
    renderNavbar();

    expect(screen.getByLabelText(/Notificaciones/i)).toBeInTheDocument();
  });

  it("muestra el botón de cambio de tema", () => {
    renderNavbar();

    expect(screen.getByLabelText(/Cambiar tema/i)).toBeInTheDocument();
  });

  it("muestra el selector de idioma", () => {
    renderNavbar();

    expect(screen.getByLabelText(/Switch to English|Cambiar a Español/i)).toBeInTheDocument();
  });
});
