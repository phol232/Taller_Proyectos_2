import axios from "axios";
import { toastError } from "@/lib/utils";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  withCredentials: true, // envía la cookie httpOnly con el JWT
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request interceptor ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toastError("Error de conexión", "No se pudo comunicar con el servidor.");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401) {
      // Solo redirigir si el 401 NO viene de un endpoint de auth
      // (login/password-reset devuelven 401 como respuesta normal de negocio)
      const isAuthEndpoint = error.config?.url?.includes("/api/auth/");
      if (!isAuthEndpoint && typeof window !== "undefined") {
        window.location.replace("/login");
      }
    } else if (status === 403) {
      toastError("Sin permisos", "Tu rol no tiene acceso a esta acción.");
    } else if (status === 409) {
      // Conflicto de recurso concurrente (RF-09)
      toastError("Conflicto de recurso", data?.message ?? "El recurso ya fue asignado por otro usuario.");
    } else if (status >= 500) {
      toastError("Error del servidor", "Ocurrió un error interno. Intenta de nuevo.");
    }

    return Promise.reject(error);
  }
);

export default api;
