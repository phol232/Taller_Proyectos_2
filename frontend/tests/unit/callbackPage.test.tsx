import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CallbackPage from "@/app/(auth)/callback/page";
import { useAuthStore } from "@/store/auth.store";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn() },
}));

const { default: api } = await import("@/lib/api");

describe("CallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  it("muestra indicador de carga", () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} });
    render(<CallbackPage />);

    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
    expect(screen.getByText("Iniciando sesión…")).toBeInTheDocument();
  });

  it("carga usuario y redirige al dashboard", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: "u1",
        fullName: "Ana García",
        email: "ana@continental.edu.pe",
        role: "ADMIN",
        avatarUrl: "http://example.com/avatar.png",
      },
    });

    render(<CallbackPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toMatchObject({
      id: "u1",
      name: "Ana García",
      email: "ana@continental.edu.pe",
      role: "admin",
      avatarUrl: "http://example.com/avatar.png",
    });
  });

  it("redirige al login cuando falla la carga del usuario", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Unauthorized"));

    render(<CallbackPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?error=oauth2_failed"));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
