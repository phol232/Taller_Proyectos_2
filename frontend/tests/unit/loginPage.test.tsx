import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}));

const { default: api } = await import("@/lib/api");

function renderPage() {
  return render(
    <I18nProvider>
      <LoginPage />
    </I18nProvider>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/login");
    sessionStorage.clear();
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("muestra errores de validación con campos vacíos", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("El correo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña es obligatoria.")).toBeInTheDocument();
  });

  it("rechaza correos fuera del dominio institucional", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "ana@gmail.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Solo se permiten correos @continental.edu.pe.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("inicia sesión correctamente y redirige al dashboard", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: { user: { id: "1", fullName: "Ana García", email: "ana@continental.edu.pe", role: "ADMIN" } },
    });
    renderPage();

    await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "ana@continental.edu.pe");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("muestra error de cuenta desactivada", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({ response: { status: 401, data: { code: "ACCOUNT_DISABLED" } } });
    renderPage();

    await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "ana@continental.edu.pe");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it("alterna visibilidad de la contraseña", async () => {
    const user = userEvent.setup();
    renderPage();

    const passwordInput = screen.getByPlaceholderText("••••••••");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("navega a recuperar contraseña", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));

    expect(pushMock).toHaveBeenCalledWith("/forgot-password");
  });

  it("muestra el modal de dominio no permitido cuando viene el query param", async () => {
    window.history.pushState({}, "", "/login?error=domain_not_allowed");
    renderPage();

    expect(await screen.findByText("Correo no permitido")).toBeInTheDocument();
  });

  it("redirige a Google OAuth al hacer click en continuar con Google", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    // @ts-expect-error jsdom location override for test
    delete window.location;
    window.location = { ...originalLocation, href: "" } as Location;

    renderPage();
    await user.click(screen.getByRole("button", { name: /Continuar con Google/i }));

    expect(window.location.href).toContain("/oauth2/authorization/google");
    window.location = originalLocation;
  });
});
