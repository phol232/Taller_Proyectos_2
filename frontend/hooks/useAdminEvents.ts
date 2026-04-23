"use client";

import { useEffect, useRef } from "react";

type AdminEventName =
  | "courses.changed"
  | "teachers.changed"
  | "classrooms.changed"
  | "students.changed"
  | "academic-periods.changed"
  | "course-offerings.changed"
  | "facultades.changed"
  | "carreras.changed";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * Subscribes to the admin SSE stream and invokes the handler
 * whenever one of the specified events is received from the backend.
 *
 * - Automatically reconnects on transient errors (EventSource default behavior).
 * - Triggers the handler on reconnect so data is refreshed even if an event
 *   was missed while the connection was down.
 * - The cookie-based JWT is sent because `withCredentials: true` is used.
 */
export function useAdminEvents(
  events: AdminEventName | AdminEventName[],
  handler: () => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const url = `${API_BASE}/api/admin/events`;
    const source = new EventSource(url, { withCredentials: true });

    const list = Array.isArray(events) ? events : [events];
    const listener = () => handlerRef.current();

    list.forEach((name) => source.addEventListener(name, listener));

    // Reload data on reconnect: if the connection dropped and we missed an event,
    // the first open after a reconnect triggers a fresh fetch.
    let isFirstOpen = true;
    source.onopen = () => {
      if (isFirstOpen) {
        isFirstOpen = false;
        return;
      }
      // Reconnected after a drop — refresh to avoid stale state.
      handlerRef.current();
    };

    source.onerror = () => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[useAdminEvents] SSE conexión perdida, reintentando...");
      }
    };

    return () => {
      list.forEach((name) => source.removeEventListener(name, listener));
      source.close();
    };
    // `events` se serializa vía JSON.stringify para estabilidad de dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);
}
