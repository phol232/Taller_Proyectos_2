"use client";

import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/lib/i18n";
import type { Role } from "@/types/entities";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/**
 * Protege rutas por rol. Redirige a /login si no hay sesión.
 * Muestra mensaje de acceso denegado si el rol no está permitido.
 * RF-18 — control de acceso frontend (UX layer).
 * La verificación real de permisos ocurre en el backend.
 */
export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isAuthenticated, role, _hasHydrated } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Esperar hidratación antes de decidir — evita redirect falso al recargar
  if (!_hasHydrated) return null;

  if (!isAuthenticated) return null;

  if (role && !allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-2xl font-semibold tracking-tight text-vercel-black">
          Acceso denegado
        </p>
        <p className="text-sm text-gray-500">
          {t.common.accessDeniedDesc}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
