import { beforeEach, describe, expect, it } from "vitest";
import { useScheduleStore } from "@/store/schedule.store";
import type { Assignment, WeeklySchedule } from "@/types/schedule";

const makeAssignment = (id: string, courseCode = "INF-101"): Assignment => ({
  id,
  courseId: `course-${id}`,
  courseName: `Curso ${courseCode}`,
  courseCode,
  teacherId: "teacher-1",
  teacherName: "Docente Uno",
  classroomId: "classroom-1",
  classroomCode: "A-101",
  timeSlot: { day: "MONDAY", startTime: "07:00", endTime: "08:30" },
});

const makeDraft = (id = "schedule-1"): WeeklySchedule => ({
  id,
  periodId: "period-1",
  status: "draft",
  assignments: [makeAssignment("a1"), makeAssignment("a2")],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

describe("scheduleStore — integración", () => {
  beforeEach(() => {
    useScheduleStore.setState({ draft: null, status: "idle" });
  });

  describe("estado inicial", () => {
    it("draft es null y status es idle", () => {
      const { draft, status } = useScheduleStore.getState();
      expect(draft).toBeNull();
      expect(status).toBe("idle");
    });
  });

  describe("setDraft", () => {
    it("establece el borrador y cambia status a draft", () => {
      const schedule = makeDraft();
      useScheduleStore.getState().setDraft(schedule);

      const { draft, status } = useScheduleStore.getState();
      expect(draft).toEqual(schedule);
      expect(status).toBe("draft");
    });

    it("reemplaza un borrador existente por uno nuevo", () => {
      useScheduleStore.getState().setDraft(makeDraft("schedule-1"));
      useScheduleStore.getState().setDraft(makeDraft("schedule-2"));

      expect(useScheduleStore.getState().draft?.id).toBe("schedule-2");
    });
  });

  describe("updateAssignment", () => {
    it("actualiza una asignación existente en el borrador", () => {
      useScheduleStore.getState().setDraft(makeDraft());
      const updated: Assignment = {
        ...makeAssignment("a1", "INF-201"),
        id: "a1",
      };

      useScheduleStore.getState().updateAssignment(updated);

      const assignment = useScheduleStore.getState().draft?.assignments.find((a) => a.id === "a1");
      expect(assignment?.courseCode).toBe("INF-201");
    });

    it("agrega una asignación nueva cuando no existe en el borrador", () => {
      useScheduleStore.getState().setDraft(makeDraft());
      const newAssignment = makeAssignment("a3", "INF-301");

      useScheduleStore.getState().updateAssignment(newAssignment);

      const assignments = useScheduleStore.getState().draft?.assignments;
      expect(assignments?.some((a) => a.id === "a3")).toBe(true);
      expect(assignments).toHaveLength(3);
    });

    it("no modifica el estado cuando no hay borrador activo", () => {
      const assignment = makeAssignment("a1");
      useScheduleStore.getState().updateAssignment(assignment);

      expect(useScheduleStore.getState().draft).toBeNull();
    });

    it("no modifica otras asignaciones al actualizar una", () => {
      useScheduleStore.getState().setDraft(makeDraft());
      useScheduleStore.getState().updateAssignment({ ...makeAssignment("a1"), courseCode: "UPD" });

      const a2 = useScheduleStore.getState().draft?.assignments.find((a) => a.id === "a2");
      expect(a2?.courseCode).toBe("INF-101");
    });
  });

  describe("removeAssignment", () => {
    it("elimina la asignación con el id indicado", () => {
      useScheduleStore.getState().setDraft(makeDraft());

      useScheduleStore.getState().removeAssignment("a1");

      const assignments = useScheduleStore.getState().draft?.assignments;
      expect(assignments?.some((a) => a.id === "a1")).toBe(false);
      expect(assignments).toHaveLength(1);
    });

    it("no elimina nada si el id no existe en el borrador", () => {
      useScheduleStore.getState().setDraft(makeDraft());

      useScheduleStore.getState().removeAssignment("non-existent");

      expect(useScheduleStore.getState().draft?.assignments).toHaveLength(2);
    });

    it("no modifica el estado cuando no hay borrador activo", () => {
      useScheduleStore.getState().removeAssignment("a1");
      expect(useScheduleStore.getState().draft).toBeNull();
    });

    it("deja el borrador con cero asignaciones si se elimina la única existente", () => {
      const singleDraft: WeeklySchedule = { ...makeDraft(), assignments: [makeAssignment("only")] };
      useScheduleStore.getState().setDraft(singleDraft);

      useScheduleStore.getState().removeAssignment("only");

      expect(useScheduleStore.getState().draft?.assignments).toHaveLength(0);
    });
  });

  describe("setStatus", () => {
    it("actualiza el status a confirmed", () => {
      useScheduleStore.getState().setStatus("confirmed");
      expect(useScheduleStore.getState().status).toBe("confirmed");
    });

    it("actualiza el status a cancelled", () => {
      useScheduleStore.getState().setStatus("cancelled");
      expect(useScheduleStore.getState().status).toBe("cancelled");
    });

    it("actualiza el status a idle", () => {
      useScheduleStore.getState().setDraft(makeDraft());
      useScheduleStore.getState().setStatus("idle");
      expect(useScheduleStore.getState().status).toBe("idle");
    });
  });

  describe("clearDraft", () => {
    it("limpia el borrador y restablece status a idle", () => {
      useScheduleStore.getState().setDraft(makeDraft());

      useScheduleStore.getState().clearDraft();

      const { draft, status } = useScheduleStore.getState();
      expect(draft).toBeNull();
      expect(status).toBe("idle");
    });

    it("no lanza si se llama sin borrador activo", () => {
      expect(() => useScheduleStore.getState().clearDraft()).not.toThrow();
    });
  });
});
