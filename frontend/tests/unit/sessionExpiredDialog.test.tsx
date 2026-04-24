import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import SessionExpiredDialog from "@/components/shared/SessionExpiredDialog";
import {
  closeExpiredSession,
  queueSessionRecovery,
  resetSessionRecoveryForTests,
} from "@/lib/sessionRecovery";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const locationReplaceSpy = vi.fn();
Object.defineProperty(window, "location", {
  value: { replace: locationReplaceSpy },
  writable: true,
});

describe("SessionExpiredDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationReplaceSpy.mockReset();
    resetSessionRecoveryForTests();
  });

  afterEach(() => {
    closeExpiredSession();
    vi.restoreAllMocks();
    resetSessionRecoveryForTests();
  });

  it("renderiza mensaje y acciones cuando la sesión expira", () => {
    void queueSessionRecovery(() => Promise.resolve({ ok: true }), new Error("expired")).catch(() => undefined);

    render(<SessionExpiredDialog />);

    expect(screen.getByRole("heading", { name: "Sesión expirada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restaurar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeInTheDocument();
  });

  it("restaura sesión desde el botón principal", async () => {
    const retrySpy = vi.fn().mockResolvedValue({ ok: true });
    const refreshSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          fullName: "Usuario Test",
          email: "user@continental.edu.pe",
          role: "STUDENT",
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });

    void queueSessionRecovery(retrySpy, new Error("expired")).catch(() => undefined);
    render(<SessionExpiredDialog />);

    await userEvent.click(screen.getByRole("button", { name: /Restaurar sesión/i }));

    await waitFor(() => expect(refreshSpy).toHaveBeenCalledWith("/api/auth/refresh"));
    await waitFor(() => expect(retrySpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Sesión expirada" })).not.toBeInTheDocument());
  });

  it("cierra sesión y redirige al login", async () => {
    vi.spyOn(api, "post").mockResolvedValue({
      data: undefined,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });

    void queueSessionRecovery(() => Promise.resolve({ ok: true }), new Error("expired")).catch(() => undefined);
    render(<SessionExpiredDialog />);

    await userEvent.click(screen.getByRole("button", { name: /Cerrar sesión/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/auth/logout"));
    expect(locationReplaceSpy).toHaveBeenCalledWith("/login");
  });
});
