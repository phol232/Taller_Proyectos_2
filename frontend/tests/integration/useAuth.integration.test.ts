import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/auth";

const makeUser = (role: User["role"] = "student"): User => ({
  id: "user-1",
  name: "Test User",
  email: "test@continental.edu.pe",
  role,
  avatarUrl: undefined,
});

describe("useAuth — integración con auth.store", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout();
    });
  });

  it("estado inicial — no autenticado", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("login — actualiza user, role e isAuthenticated", () => {
    const { result } = renderHook(() => useAuth());
    const user = makeUser("admin");

    act(() => {
      result.current.login(user);
    });

    expect(result.current.user).toMatchObject({ id: "user-1", role: "admin" });
    expect(result.current.role).toBe("admin");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logout — limpia user, role e isAuthenticated", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login(makeUser("student"));
    });
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  describe("hasRole", () => {
    it("retorna false cuando el usuario no está autenticado", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.hasRole("admin")).toBe(false);
      expect(result.current.hasRole("student", "teacher")).toBe(false);
    });

    it("retorna true cuando el rol del usuario coincide con uno de los roles dados", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(makeUser("coordinator"));
      });

      expect(result.current.hasRole("coordinator")).toBe(true);
      expect(result.current.hasRole("admin", "coordinator")).toBe(true);
    });

    it("retorna false cuando el rol no coincide", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(makeUser("student"));
      });

      expect(result.current.hasRole("admin")).toBe(false);
      expect(result.current.hasRole("coordinator", "teacher")).toBe(false);
    });

    it("distingue correctamente entre todos los roles del sistema", () => {
      const roles: User["role"][] = ["admin", "coordinator", "teacher", "student"];

      for (const role of roles) {
        const { result } = renderHook(() => useAuth());

        act(() => {
          useAuthStore.getState().logout();
          result.current.login(makeUser(role));
        });

        expect(result.current.hasRole(role)).toBe(true);
        const otherRoles = roles.filter((r) => r !== role);
        expect(result.current.hasRole(...otherRoles)).toBe(false);
      }
    });
  });

  it("normaliza el rol a minúsculas en el login", () => {
    const { result } = renderHook(() => useAuth());
    const userWithUpperCaseRole = { ...makeUser(), role: "ADMIN" as User["role"] };

    act(() => {
      result.current.login(userWithUpperCaseRole);
    });

    expect(result.current.role).toBe("admin");
    expect(result.current.hasRole("admin")).toBe(true);
  });
});
