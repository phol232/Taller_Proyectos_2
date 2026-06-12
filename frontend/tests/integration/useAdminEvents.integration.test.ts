import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminEvents } from "@/hooks/useAdminEvents";

type MockEventSourceInstance = {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  url: string;
  withCredentials: boolean;
};

let mockInstance: MockEventSourceInstance;

class MockEventSource {
  url: string;
  withCredentials: boolean;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  close = vi.fn();

  constructor(url: string, opts?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = opts?.withCredentials ?? false;
    // expose this instance so tests can interact with it
    mockInstance = this as unknown as MockEventSourceInstance;
  }
}

describe("useAdminEvents — integración con SSE", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("crea EventSource con la URL correcta y withCredentials", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("courses.changed", handler));

    expect(mockInstance.url).toContain("/api/admin/events");
    expect(mockInstance.withCredentials).toBe(true);
  });

  it("registra listener para el evento indicado", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("teachers.changed", handler));

    expect(mockInstance.addEventListener).toHaveBeenCalledWith(
      "teachers.changed",
      expect.any(Function),
    );
  });

  it("registra listeners para múltiples eventos", () => {
    const handler = vi.fn();
    const events = ["courses.changed", "teachers.changed"] as const;

    renderHook(() => useAdminEvents([...events], handler));

    expect(mockInstance.addEventListener).toHaveBeenCalledWith("courses.changed", expect.any(Function));
    expect(mockInstance.addEventListener).toHaveBeenCalledWith("teachers.changed", expect.any(Function));
  });

  it("invoca el handler cuando llega un evento SSE", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("classrooms.changed", handler));

    const addedCall = mockInstance.addEventListener.mock.calls.find(
      ([name]: [string]) => name === "classrooms.changed",
    );
    const listener = addedCall?.[1] as () => void;
    act(() => {
      listener();
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("no dispara el handler en el primer onopen (conexión inicial)", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("students.changed", handler));

    act(() => {
      mockInstance.onopen?.(new Event("open"));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("dispara el handler en el segundo onopen (reconexión)", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("schedules.changed", handler));

    act(() => {
      mockInstance.onopen?.(new Event("open"));
    });
    act(() => {
      mockInstance.onopen?.(new Event("open"));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("cierra EventSource y elimina listeners al desmontar", () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useAdminEvents("academic-periods.changed", handler));

    unmount();

    expect(mockInstance.removeEventListener).toHaveBeenCalledWith(
      "academic-periods.changed",
      expect.any(Function),
    );
    expect(mockInstance.close).toHaveBeenCalledTimes(1);
  });

  it("cierra todos los listeners cuando se desmontan múltiples eventos", () => {
    const handler = vi.fn();
    const events = ["facultades.changed", "carreras.changed"] as const;

    const { unmount } = renderHook(() => useAdminEvents([...events], handler));

    unmount();

    expect(mockInstance.removeEventListener).toHaveBeenCalledWith("facultades.changed", expect.any(Function));
    expect(mockInstance.removeEventListener).toHaveBeenCalledWith("carreras.changed", expect.any(Function));
    expect(mockInstance.close).toHaveBeenCalledTimes(1);
  });

  it("no lanza cuando onerror es invocado", () => {
    const handler = vi.fn();

    renderHook(() => useAdminEvents("courses.changed", handler));

    expect(() => {
      act(() => {
        mockInstance.onerror?.(new Event("error"));
      });
    }).not.toThrow();
  });
});
