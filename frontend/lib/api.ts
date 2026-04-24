import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import {
  closeExpiredSession,
  normalizeAuthUser,
  queueSessionRecovery,
  registerSessionRefreshHandler,
} from "@/lib/sessionRecovery";
import { toastError } from "@/lib/utils";
import type { AuthResponse } from "@/types/auth";

type ApiErrorData = {
  message?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _sessionRetry?: boolean;
};

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

function getRequestUrl(error: AxiosError<ApiErrorData>) {
  return error.config?.url ?? error.response?.config.url ?? "";
}

function isSessionRecoveryExcluded(url: string) {
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/password-reset/") ||
    url.includes("/api/auth/logout")
  );
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}

registerSessionRefreshHandler(async () => {
  const { data } = await api.post<AuthResponse>("/api/auth/refresh");
  return { user: normalizeAuthUser(data.user) };
});

// ─── Response interceptor ─────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorData>) => {
    if (!error.response) {
      toastError("Error de conexión", "No se pudo comunicar con el servidor.");
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const url = getRequestUrl(error);

    if (status === 401) {
      if (url.includes("/api/auth/refresh")) {
        closeExpiredSession(error);
        redirectToLogin();
        return Promise.reject(error);
      }

      if (!isSessionRecoveryExcluded(url) && error.config) {
        const originalConfig = error.config as RetriableRequestConfig;

        if (originalConfig._sessionRetry) {
          closeExpiredSession(error);
          redirectToLogin();
          return Promise.reject(error);
        }

        originalConfig._sessionRetry = true;
        return queueSessionRecovery<AxiosResponse>(
          () => api.request(originalConfig),
          error
        );
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
