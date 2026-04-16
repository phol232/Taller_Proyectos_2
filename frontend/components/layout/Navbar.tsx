"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  coordinator: "Coordinador",
  teacher:     "Docente",
  student:     "Estudiante",
};

export default function Navbar() {
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      toastSuccess("Sesión cerrada", "Has salido correctamente.");
    } catch {
      // Si el backend falla (ej. token ya expirado), cerramos igualmente
      toastError("Sesión cerrada", "No se pudo contactar al servidor, pero tu sesión fue cerrada localmente.");
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-pure-white">
      <div className="mx-auto max-w-[1200px] px-4 flex items-center justify-between h-14">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-vercel-black flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-vercel-black">
            Planner UC
          </span>
        </div>

        {/* Usuario + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Avatar inicial */}
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-gray-600 select-none">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-sm font-medium text-vercel-black truncate max-w-[160px]">
                  {user.name}
                </span>
                <span className="text-xs text-gray-400">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>

            <div className="w-px h-4 bg-gray-100" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Cerrar sesión"
              className="h-8 px-2.5 text-gray-500 hover:text-vercel-black hover:bg-gray-50 gap-1.5 cursor-pointer"
            >
              {loggingOut
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <LogOut className="h-3.5 w-3.5" />}
              <span className="text-xs hidden sm:inline">Salir</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}

