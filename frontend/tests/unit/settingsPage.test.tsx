import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/(app)/settings/page";
import { I18nProvider } from "@/lib/i18n";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

function renderPage() {
  return render(
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: "1", name: "Usuario Test", email: "user@continental.edu.pe", role: "student" },
      role: "student",
      isAuthenticated: true,
    });
    vi.spyOn(api, "get").mockResolvedValue({
      data: [
        {
          id: "session-1",
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
          createdAt: "2026-05-18T10:00:00Z",
          expiresAt: "2026-05-19T10:00:00Z",
        },
      ],
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    vi.restoreAllMocks();
  });

  it("renderiza secciones de apariencia, notificaciones y sesiones", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /apariencia/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /notificaciones/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sesiones activas/i })).toBeInTheDocument();
  });

  it("muestra la sesión activa cargada desde la API", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/computadora/i)).toBeInTheDocument();
    });
  });

  it("permite cambiar el idioma", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByRole("heading", { name: /apariencia/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /inglés/i }));
    expect(localStorage.getItem("planner-uc-locale")).toBe("en");
  });
});
