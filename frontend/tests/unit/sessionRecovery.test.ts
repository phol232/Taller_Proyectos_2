import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeExpiredSession,
  normalizeAuthUser,
  queueSessionRecovery,
  registerSessionRefreshHandler,
  resetSessionRecoveryForTests,
  restoreSession,
  useSessionRecovery,
} from "@/lib/sessionRecovery";
import { useAuthStore } from "@/store/auth.store";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuthResponse } from "@/types/auth";

describe("sessionRecovery", () => {
  beforeEach(() => {
    resetSessionRecoveryForTests();
    registerSessionRefreshHandler(null as unknown as () => Promise<AuthResponse>);
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    resetSessionRecoveryForTests();
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  it("normalizeAuthUser mapea campos del backend", () => {
    const user = normalizeAuthUser({
      id: "user-1",
      email: "test@continental.edu.pe",
      fullName: "Usuario Test",
      role: "STUDENT",
      avatarUrl: null,
    });

    expect(user).toEqual({
      id: "user-1",
      name: "Usuario Test",
      email: "test@continental.edu.pe",
      role: "student",
      avatarUrl: undefined,
    });
  });

  it("queueSessionRecovery marca la sesión como expirada", async () => {
    const { result } = renderHook(() => useSessionRecovery());
    expect(result.current.status).toBe("idle");

    const recoveryPromise = queueSessionRecovery(async () => "ok", new Error("401"));
    await waitFor(() => expect(result.current.status).toBe("expired"));

    closeExpiredSession(new Error("logout"));
    await expect(recoveryPromise).rejects.toThrow("logout");
    expect(result.current.status).toBe("idle");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("restoreSession reintenta peticiones pendientes tras refresh exitoso", async () => {
    const refreshHandler = vi.fn().mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@continental.edu.pe",
        fullName: "Usuario",
        role: "ADMIN",
      },
    } satisfies AuthResponse);
    registerSessionRefreshHandler(refreshHandler);

    const retry = vi.fn().mockResolvedValue({ data: "retry-ok" });
    const recoveryPromise = queueSessionRecovery(retry, new Error("401"));

    await restoreSession();

    await expect(recoveryPromise).resolves.toEqual({ data: "retry-ok" });
    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("restoreSession sin handler cierra la sesión", async () => {
    registerSessionRefreshHandler(null as unknown as () => Promise<AuthResponse>);
    const recoveryPromise = queueSessionRecovery(async () => "x", new Error("401"));

    await expect(restoreSession()).rejects.toThrow(/not configured/i);
    await expect(recoveryPromise).rejects.toThrow(/not configured/i);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
