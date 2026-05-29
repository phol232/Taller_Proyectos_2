import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  addCourseAssignment,
  addSlot,
  getScheduleAssignments,
  getTimeSlots,
  removeAssignment,
  removeSlot,
  validateSlot,
} from "@/lib/scheduleBuilderApi";
import type { ScheduleAssignment, SlotConflict, TimeSlot } from "@/types/scheduleBuilder";

describe("scheduleBuilderApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("obtiene las franjas horarias activas", async () => {
    const slots: TimeSlot[] = [
      {
        id: "slot-1",
        dayOfWeek: "MONDAY",
        startTime: "07:00",
        endTime: "08:30",
        slotOrder: 1,
      },
    ];
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: slots });

    await expect(getTimeSlots()).resolves.toEqual(slots);

    expect(getSpy).toHaveBeenCalledWith("/api/schedules/time-slots");
  });

  it("obtiene las asignaciones de un horario", async () => {
    const assignments: ScheduleAssignment[] = [
      {
        assignmentId: "assignment-1",
        courseId: "course-1",
        courseCode: "INF-101",
        courseName: "Programación",
        courseComponentId: "component-1",
        componentType: "THEORY",
        componentWeeklyHours: 3,
        teacherId: "teacher-1",
        teacherCode: "DOC-1",
        teacherName: "Docente Uno",
        sectionId: null,
        sectionNrc: null,
        assignmentStatus: "DRAFT",
        assignedHours: 1.5,
        complete: false,
        slots: [],
      },
    ];
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: assignments });

    await expect(getScheduleAssignments("schedule-1")).resolves.toEqual(assignments);

    expect(getSpy).toHaveBeenCalledWith("/api/schedules/schedule-1/assignments");
  });

  it("crea asignaciones y franjas con el payload esperado", async () => {
    const postSpy = vi.spyOn(api, "post")
      .mockResolvedValueOnce({ data: { assignmentId: "assignment-1" } })
      .mockResolvedValueOnce({ data: { slotId: "slot-row-1" } });
    const slotPayload = {
      classroomId: "classroom-1",
      timeSlotId: "slot-1",
      startTime: "07:00",
      endTime: "08:30",
    };

    await expect(addCourseAssignment("schedule-1", {
      courseComponentId: "component-1",
      teacherId: "teacher-1",
      slots: [slotPayload],
    })).resolves.toEqual({ assignmentId: "assignment-1" });
    await expect(addSlot("assignment-1", slotPayload)).resolves.toEqual({ slotId: "slot-row-1" });

    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      "/api/schedules/schedule-1/assignments",
      {
        courseComponentId: "component-1",
        teacherId: "teacher-1",
        slots: [slotPayload],
      },
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      "/api/schedules/assignments/assignment-1/slots",
      slotPayload,
    );
  });

  it("elimina asignaciones y franjas", async () => {
    const deleteSpy = vi.spyOn(api, "delete")
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({
        data: {
          assignmentId: "assignment-1",
          assignmentLeftIncomplete: true,
          assignedHours: 1.5,
          requiredHours: 3,
        },
      });

    await expect(removeAssignment("assignment-1")).resolves.toBeUndefined();
    await expect(removeSlot("slot-row-1")).resolves.toEqual({
      assignmentId: "assignment-1",
      assignmentLeftIncomplete: true,
      assignedHours: 1.5,
      requiredHours: 3,
    });

    expect(deleteSpy).toHaveBeenNthCalledWith(1, "/api/schedules/assignments/assignment-1");
    expect(deleteSpy).toHaveBeenNthCalledWith(2, "/api/schedules/slots/slot-row-1");
  });

  it("valida conflictos de una franja", async () => {
    const conflicts: SlotConflict[] = [
      {
        conflictType: "TEACHER_BUSY",
        resourceId: "teacher-1",
        message: "El docente ya dicta otra clase.",
      },
    ];
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({ data: conflicts });
    const payload = {
      assignmentId: null,
      teacherId: "teacher-1",
      classroomId: "classroom-1",
      timeSlotId: "slot-1",
      startTime: "07:00",
      endTime: "08:30",
      excludeSlotId: null,
    };

    await expect(validateSlot("schedule-1", payload)).resolves.toEqual(conflicts);

    expect(postSpy).toHaveBeenCalledWith("/api/schedules/schedule-1/validate", payload);
  });
});
