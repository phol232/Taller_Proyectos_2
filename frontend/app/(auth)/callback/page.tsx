"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

/**
 * Página de callback OAuth2.
 * El backend redirige aquí tras login con Google.
 * Carga los datos del usuario desde /api/auth/me (la cookie httpOnly ya fue seteada)
 * y redirige al dashboard.
 */
export default function CallbackPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(({ data }) => {
        login({
          id: data.id,
          name: data.fullName,
          email: data.email,
          role: data.role,
        });
        router.replace("/dashboard");
      })
      .catch(() => {
        router.replace("/login?error=oauth2_failed");
      });
  }, [login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-8 w-8 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-label="Cargando"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
          />
        </svg>
        <p className="text-sm text-gray-500">Iniciando sesión…</p>
      </div>
    </div>
  );
}
