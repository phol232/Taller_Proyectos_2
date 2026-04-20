import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  closeMobileSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleSidebar: () =>
        set((state) => {
          const isDesktop =
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 1024px)").matches;

          return isDesktop
            ? { sidebarCollapsed: !state.sidebarCollapsed }
            : { mobileSidebarOpen: !state.mobileSidebarOpen };
        }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
    }),
    {
      name: "planner-uc-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);