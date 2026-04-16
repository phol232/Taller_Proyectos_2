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
  const { isAuthenticated, role } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

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
