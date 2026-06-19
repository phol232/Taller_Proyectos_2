import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/store/ui.store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tiene el estado inicial correcto", () => {
    const state = useUiStore.getState();

    expect(state.sidebarCollapsed).toBe(false);
    expect(state.mobileSidebarOpen).toBe(false);
  });

  it("setSidebarCollapsed actualiza el estado", () => {
    useUiStore.getState().setSidebarCollapsed(true);

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it("setMobileSidebarOpen actualiza el estado", () => {
    useUiStore.getState().setMobileSidebarOpen(true);

    expect(useUiStore.getState().mobileSidebarOpen).toBe(true);
  });

  it("closeMobileSidebar cierra el sidebar móvil", () => {
    useUiStore.setState({ mobileSidebarOpen: true });

    useUiStore.getState().closeMobileSidebar();

    expect(useUiStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("toggleSidebar colapsa el sidebar en desktop", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true } as MediaQueryList));

    useUiStore.getState().toggleSidebar();

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    expect(useUiStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("toggleSidebar alterna el sidebar móvil en vista móvil", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false } as MediaQueryList));

    useUiStore.getState().toggleSidebar();

    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    expect(useUiStore.getState().mobileSidebarOpen).toBe(true);
  });
});
