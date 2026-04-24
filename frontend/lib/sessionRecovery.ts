"use client";

import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/auth.store";
import type { AuthResponse, User } from "@/types/auth";
import type { Role } from "@/types/entities";

export type SessionRecoveryStatus = "idle" | "expired" | "refreshing";

interface SessionRecoverySnapshot {
  status: SessionRecoveryStatus;
}

type RefreshHandler = () => Promise<AuthResponse>;

interface PendingRequest<T = unknown> {
  retry: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  originalError: unknown;
}

const idleSnapshot: SessionRecoverySnapshot = { status: "idle" };

let snapshot: SessionRecoverySnapshot = idleSnapshot;
let refreshHandler: RefreshHandler | null = null;
let refreshPromise: Promise<void> | null = null;
let pendingRequests: PendingRequest[] = [];

const listeners = new Set<() => void>();

function emit(next: SessionRecoverySnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useSessionRecovery() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function registerSessionRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler;
}

export function normalizeAuthUser(user: AuthResponse["user"]): User {
  return {
    id: user.id,
    name: user.name ?? user.fullName ?? user.email,
    email: user.email,
    role: String(user.role).toLowerCase() as Role,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export function queueSessionRecovery<T>(retry: () => Promise<T>, originalError: unknown): Promise<T> {
  if (snapshot.status === "idle") {
    emit({ status: "expired" });
  }

  return new Promise<T>((resolve, reject) => {
    pendingRequests.push({
      retry: retry as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      originalError,
    });
  });
}

export function hasPendingSessionRecovery() {
  return snapshot.status !== "idle";
}

export async function restoreSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (!refreshHandler) {
    closeExpiredSession(new Error("Session refresh handler is not configured"));
    return Promise.reject(new Error("Session refresh handler is not configured"));
  }

  emit({ status: "refreshing" });

  refreshPromise = refreshHandler()
    .then((response) => {
      useAuthStore.getState().login(normalizeAuthUser(response.user));
      const requests = pendingRequests;
      pendingRequests = [];
      emit(idleSnapshot);

      requests.forEach((request) => {
        request.retry().then(request.resolve).catch(request.reject);
      });
    })
    .catch((error: unknown) => {
      closeExpiredSession(error);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function closeExpiredSession(reason: unknown = new Error("Session closed")) {
  const requests = pendingRequests;
  pendingRequests = [];
  useAuthStore.getState().logout();
  emit(idleSnapshot);
  requests.forEach((request) => request.reject(reason ?? request.originalError));
}

export function resetSessionRecoveryForTests() {
  pendingRequests = [];
  refreshPromise = null;
  emit(idleSnapshot);
}
