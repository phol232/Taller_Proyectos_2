import { create } from "zustand";
import type { Conflict } from "@/types/schedule";

interface NotificationState {
  conflicts: Conflict[];
  addConflict: (conflict: Conflict) => void;
  clearConflicts: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  conflicts: [],

  addConflict: (conflict) =>
    set((state) => ({ conflicts: [...state.conflicts, conflict] })),

  clearConflicts: () => set({ conflicts: [] }),
}));
