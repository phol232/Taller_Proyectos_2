import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth";
import type { Role } from "@/types/entities";

interface AuthState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: (user) => {
        const normalized = { ...user, role: user.role?.toLowerCase() as Role };
        set({ user: normalized, role: normalized.role, isAuthenticated: true });
      },

      logout: () =>
        set({ user: null, role: null, isAuthenticated: false }),
    }),
    {
      name: "planner-uc-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Solo persistir datos no sensibles; el JWT viaja en cookie httpOnly
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
