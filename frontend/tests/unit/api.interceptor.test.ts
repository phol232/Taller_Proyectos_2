import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";

// Mock de sonner para verificar los toasts sin efectos secundarios
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";

// Mock de window.location para verificar redirecciones
const locationReplaceSpy = vi.fn();
Object.defineProperty(window, "location", {
  value: { replace: locationReplaceSpy },
  writable: true,
});

// Importar el módulo DESPUÉS del mock de sonner
import api from "@/lib/api";

// Tipo para acceder a los handlers internos del interceptor de Axios
type InterceptorManager = {
  handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
};

// Helper para invocar el interceptor de error registrado
function callRejected(error: unknown) {
  return (api.interceptors.response as unknown as InterceptorManager).handlers[0].rejected(error);
}

// Helpers para simular el error de Axios como lo hace el interceptor
function makeAxiosError(
  status: number,
  url: string,
  data: Record<string, unknown> = {}
): AxiosError {
  const error = new axios.AxiosError("Request failed");
  error.response = {
    status,
    data,
    headers: {},
    config: { url } as never,
    statusText: String(status),
  };
  error.config = { url } as never;
  return error;
}

describe("api.ts — interceptor de respuesta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationReplaceSpy.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 401 en endpoint de auth: NO redirige ────────────────────────────────

  it("401 desde /api/auth/login → NO redirige a /login", async () => {
    // Simular rechazo con el error desde un endpoint auth
    const error = makeAxiosError(401, "/api/auth/login");
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(locationReplaceSpy).not.toHaveBeenCalled();
  });

  it("401 desde /api/auth/password-reset/verify → NO redirige", async () => {
    const error = makeAxiosError(401, "/api/auth/password-reset/verify");
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(locationReplaceSpy).not.toHaveBeenCalled();
  });

  // ── 401 fuera de auth: REDIRIGE ─────────────────────────────────────────

  it("401 desde /api/schedules → redirige a /login", async () => {
    const error = makeAxiosError(401, "/api/schedules");
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(locationReplaceSpy).toHaveBeenCalledWith("/login");
  });

  // ── 403 → toast de sin permisos ─────────────────────────────────────────

  it("403 → muestra toast 'Sin permisos'", async () => {
    const error = makeAxiosError(403, "/api/some-protected-endpoint");
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(toast.error).toHaveBeenCalledWith("Sin permisos", expect.any(Object));
  });

  // ── 409 → toast de conflicto ─────────────────────────────────────────────

  it("409 → muestra toast 'Conflicto de recurso'", async () => {
    const error = makeAxiosError(409, "/api/schedules", { message: "Ya asignado" });
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(toast.error).toHaveBeenCalledWith("Conflicto de recurso", expect.any(Object));
  });

  // ── 500 → toast de error del servidor ────────────────────────────────────

  it("500 → muestra toast 'Error del servidor'", async () => {
    const error = makeAxiosError(500, "/api/schedules");
    try {
      await callRejected(error);
    } catch {
      // Se espera rechazo
    }
    expect(toast.error).toHaveBeenCalledWith("Error del servidor", expect.any(Object));
  });

  // ── Sin respuesta: error de red ───────────────────────────────────────────

  it("error sin response → muestra toast 'Error de conexión'", async () => {
    const networkError = new axios.AxiosError("Network Error");
    // Sin networkError.response → simula fallo de red
    try {
      await callRejected(networkError);
    } catch {
      // Se espera rechazo
    }
    expect(toast.error).toHaveBeenCalledWith("Error de conexión", expect.any(Object));
  });

  // ── El interceptor siempre rechaza la promesa ─────────────────────────────

  it("siempre rechaza con el error original", async () => {
    const error = makeAxiosError(500, "/api/test");
    await expect(
      callRejected(error)
    ).rejects.toThrow();
  });
});
