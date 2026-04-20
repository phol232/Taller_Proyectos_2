import { create } from "zustand";
import type { Conflict } from "@/types/schedule";

export type SystemNotificationKind = "welcome" | "schedule" | "security";

export interface SystemNotification {
  id: string;
  kind: SystemNotificationKind;
  read: boolean;
}

interface NotificationState {
  conflicts: Conflict[];
  systemNotifications: SystemNotification[];
  addConflict: (conflict: Conflict) => void;
  clearConflicts: () => void;
  markAllNotificationsRead: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  conflicts: [],
  systemNotifications: [
    { id: "welcome", kind: "welcome", read: false },
    { id: "schedule", kind: "schedule", read: false },
    { id: "security", kind: "security", read: true },
  ],

  addConflict: (conflict) =>
    set((state) => ({ conflicts: [...state.conflicts, conflict] })),

  clearConflicts: () => set({ conflicts: [] }),

  markAllNotificationsRead: () =>
    set((state) => ({
      systemNotifications: state.systemNotifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),
}));
