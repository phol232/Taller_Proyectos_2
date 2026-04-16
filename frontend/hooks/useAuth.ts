"use client";

import { useAuthStore } from "@/store/auth.store";
import type { Role } from "@/types/entities";

/**
 * Hook para acceder al estado de autenticación y al rol del usuario.
 * RF-18 — control de acceso frontend.
 */
export function useAuth() {
  const { user, role, isAuthenticated, login, logout } = useAuthStore();

  function hasRole(...roles: Role[]): boolean {
    if (!role) return false;
    return roles.includes(role);
  }

  return { user, role, isAuthenticated, login, logout, hasRole };
}
