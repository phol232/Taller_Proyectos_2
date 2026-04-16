import { create } from "zustand";
import type { WeeklySchedule, Assignment, ScheduleStatus } from "@/types/schedule";

interface ScheduleState {
  draft: WeeklySchedule | null;
  status: ScheduleStatus;
  setDraft: (schedule: WeeklySchedule) => void;
  updateAssignment: (assignment: Assignment) => void;
  removeAssignment: (assignmentId: string) => void;
  setStatus: (status: ScheduleStatus) => void;
  clearDraft: () => void;
}

export const useScheduleStore = create<ScheduleState>()((set) => ({
  draft: null,
  status: "idle",

  setDraft: (schedule) =>
    set({ draft: schedule, status: "draft" }),

  updateAssignment: (assignment) =>
    set((state) => {
      if (!state.draft) return state;
      const existing = state.draft.assignments.findIndex(
        (a) => a.id === assignment.id
      );
      const assignments =
        existing >= 0
          ? state.draft.assignments.map((a) =>
              a.id === assignment.id ? assignment : a
            )
          : [...state.draft.assignments, assignment];
      return { draft: { ...state.draft, assignments } };
    }),

  removeAssignment: (assignmentId) =>
    set((state) => {
      if (!state.draft) return state;
      return {
        draft: {
          ...state.draft,
          assignments: state.draft.assignments.filter(
            (a) => a.id !== assignmentId
          ),
        },
      };
    }),

  setStatus: (status) => set({ status }),

  clearDraft: () => set({ draft: null, status: "idle" }),
}));
