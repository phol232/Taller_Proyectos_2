import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, type AxiosResponse } from "axios";
import api from "@/lib/api";
import {
  closeExpiredSession,
  hasPendingSessionRecovery,
  resetSessionRecoveryForTests,
  restoreSession,
} from "@/lib/sessionRecovery";
import type { AuthResponse } from "@/types/auth";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";

const locationReplaceSpy = vi.fn();
Object.defineProperty(window, "location", {
  value: { replace: locationReplaceSpy },
  writable: true,
});

type InterceptorManager = {
  handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
};

function callRejected(error: unknown) {
  return (api.interceptors.response as unknown as InterceptorManager).handlers[0].rejected(error);
}

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

function makeRefreshResponse(): AxiosResponse<AuthResponse> {
  return {
    data: {
      user: {
        id: "user-1",
        fullName: "Usuario Test",
        email: "user@continental.edu.pe",
        role: "STUDENT",
        avatarUrl: null,
      },
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as never,
  };
}

describe("api.ts — interceptor de respuesta", () => {
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

  it("401 desde /api/auth/login → no abre recuperación ni redirige", async () => {
    const error = makeAxiosError(401, "/api/auth/login");

    await expect(callRejected(error)).rejects.toThrow();

    expect(hasPendingSessionRecovery()).toBe(false);
    expect(locationReplaceSpy).not.toHaveBeenCalled();
  });

  it("401 desde /api/auth/password-reset/verify → no abre recuperación ni redirige", async () => {
    const error = makeAxiosError(401, "/api/auth/password-reset/verify");

    await expect(callRejected(error)).rejects.toThrow();

    expect(hasPendingSessionRecovery()).toBe(false);
    expect(locationReplaceSpy).not.toHaveBeenCalled();
  });

  it("401 desde endpoint protegido → abre recuperación sin redirigir inmediatamente", async () => {
    const error = makeAxiosError(401, "/api/schedules");

    const pending = callRejected(error);

    expect(hasPendingSessionRecovery()).toBe(true);
    expect(locationReplaceSpy).not.toHaveBeenCalled();

    closeExpiredSession(error);
    await expect(pending).rejects.toThrow();
  });

  it("401 desde /api/auth/refresh → limpia sesión y redirige a /login", async () => {
    const error = makeAxiosError(401, "/api/auth/refresh");

    await expect(callRejected(error)).rejects.toThrow();

    expect(hasPendingSessionRecovery()).toBe(false);
    expect(locationReplaceSpy).toHaveBeenCalledWith("/login");
  });

  it("restaura sesión y reintenta la request original", async () => {
    const refreshSpy = vi.spyOn(api, "post").mockResolvedValue(makeRefreshResponse());
    const requestSpy = vi.spyOn(api, "request").mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });
    const error = makeAxiosError(401, "/api/schedules");

    const pending = callRejected(error);
    await restoreSession();

    await expect(pending).resolves.toMatchObject({ data: { ok: true } });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith("/api/auth/refresh");
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(hasPendingSessionRecovery()).toBe(false);
    expect(locationReplaceSpy).not.toHaveBeenCalled();
  });

  it("varios 401 protegidos usan un solo refresh y reintentan todas las requests", async () => {
    const refreshSpy = vi.spyOn(api, "post").mockResolvedValue(makeRefreshResponse());
    const requestSpy = vi.spyOn(api, "request").mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });

    const first = callRejected(makeAxiosError(401, "/api/schedules"));
    const second = callRejected(makeAxiosError(401, "/api/profile/me"));

    await restoreSession();

    await expect(first).resolves.toMatchObject({ data: { ok: true } });
    await expect(second).resolves.toMatchObject({ data: { ok: true } });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(hasPendingSessionRecovery()).toBe(false);
  });

  it("si refresh falla, rechaza las requests pendientes y limpia la cola", async () => {
    const refreshError = makeAxiosError(401, "/api/auth/refresh");
    vi.spyOn(api, "post").mockRejectedValue(refreshError);
    const requestSpy = vi.spyOn(api, "request");

    const pending = callRejected(makeAxiosError(401, "/api/schedules"));

    await expect(restoreSession()).rejects.toThrow();
    await expect(pending).rejects.toThrow();
    expect(requestSpy).not.toHaveBeenCalled();
    expect(hasPendingSessionRecovery()).toBe(false);
  });

  it("403 → muestra toast 'Sin permisos'", async () => {
    const error = makeAxiosError(403, "/api/some-protected-endpoint");

    await expect(callRejected(error)).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith("Sin permisos", expect.any(Object));
  });

  it("409 → muestra toast 'Conflicto de recurso'", async () => {
    const error = makeAxiosError(409, "/api/schedules", { message: "Ya asignado" });

    await expect(callRejected(error)).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith("Conflicto de recurso", expect.any(Object));
  });

  it("500 → muestra toast 'Error del servidor'", async () => {
    const error = makeAxiosError(500, "/api/schedules");

    await expect(callRejected(error)).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith("Error del servidor", expect.any(Object));
  });

  it("error sin response → muestra toast 'Error de conexión'", async () => {
    const networkError = new axios.AxiosError("Network Error");

    await expect(callRejected(networkError)).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith("Error de conexión", expect.any(Object));
  });
});
