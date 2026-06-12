import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/auth";

const makeUser = (role: string = "student"): User => ({
  id: "user-1",
  name: "Test User",
  email: "test@continental.edu.pe",
  role: role as User["role"],
  avatarUrl: undefined,
});

describe("authStore — integración", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      role: null,
      isAuthenticated: false,
      _hasHydrated: false,
    });
  });

  describe("estado inicial", () => {
    it("no autenticado por defecto", () => {
      const { user, role, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(role).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("establece user, role e isAuthenticated correctamente", () => {
      useAuthStore.getState().login(makeUser("admin"));

      const { user, role, isAuthenticated } = useAuthStore.getState();
      expect(user).not.toBeNull();
      expect(role).toBe("admin");
      expect(isAuthenticated).toBe(true);
    });

    it("normaliza el role a minúsculas", () => {
      useAuthStore.getState().login(makeUser("COORDINATOR"));

      expect(useAuthStore.getState().role).toBe("coordinator");
    });

    it("preserva todos los campos del usuario", () => {
      const user = makeUser("teacher");
      useAuthStore.getState().login(user);

      const stored = useAuthStore.getState().user;
      expect(stored?.id).toBe("user-1");
      expect(stored?.email).toBe("test@continental.edu.pe");
      expect(stored?.name).toBe("Test User");
    });

    it("permite el login con rol ADMIN", () => {
      useAuthStore.getState().login(makeUser("ADMIN"));

      expect(useAuthStore.getState().role).toBe("admin");
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it("permite el login con rol STUDENT", () => {
      useAuthStore.getState().login(makeUser("STUDENT"));

      expect(useAuthStore.getState().role).toBe("student");
    });

    it("permite el login con rol TEACHER", () => {
      useAuthStore.getState().login(makeUser("TEACHER"));

      expect(useAuthStore.getState().role).toBe("teacher");
    });

    it("permite el login con rol COORDINATOR", () => {
      useAuthStore.getState().login(makeUser("COORDINATOR"));

      expect(useAuthStore.getState().role).toBe("coordinator");
    });

    it("actualiza el usuario si se llama login dos veces (re-login)", () => {
      useAuthStore.getState().login(makeUser("student"));
      useAuthStore.getState().login({ ...makeUser("admin"), id: "user-2", name: "Admin User" });

      const { user, role } = useAuthStore.getState();
      expect(user?.id).toBe("user-2");
      expect(role).toBe("admin");
    });
  });

  describe("logout", () => {
    it("limpia user, role e isAuthenticated", () => {
      useAuthStore.getState().login(makeUser("student"));
      useAuthStore.getState().logout();

      const { user, role, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(role).toBeNull();
      expect(isAuthenticated).toBe(false);
    });

    it("no lanza si se llama sin sesión activa", () => {
      expect(() => useAuthStore.getState().logout()).not.toThrow();
    });
  });

  describe("setHasHydrated", () => {
    it("actualiza _hasHydrated a true", () => {
      useAuthStore.getState().setHasHydrated(true);
      expect(useAuthStore.getState()._hasHydrated).toBe(true);
    });

    it("actualiza _hasHydrated a false", () => {
      useAuthStore.getState().setHasHydrated(true);
      useAuthStore.getState().setHasHydrated(false);
      expect(useAuthStore.getState()._hasHydrated).toBe(false);
    });
  });
});
