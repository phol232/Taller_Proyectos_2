import axios from "axios";
import { toast } from "sonner";

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
      toast.error("Error de conexión", {
        description: "No se pudo comunicar con el servidor.",
      });
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
      toast.error("Sin permisos", {
        description: "Tu rol no tiene acceso a esta acción.",
      });
    } else if (status === 409) {
      // Conflicto de recurso concurrente (RF-09)
      toast.error("Conflicto de recurso", {
        description:
          data?.message ?? "El recurso ya fue asignado por otro usuario.",
      });
    } else if (status >= 500) {
      toast.error("Error del servidor", {
        description: "Ocurrió un error interno. Intenta de nuevo.",
      });
    }

    return Promise.reject(error);
  }
);

export default api;
