import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  cancelScheduleOption,
  confirmScheduleOption,
  generateScheduleOption,
  getScheduleGenerationRun,
  getScheduleOptions,
  getSectionsBySchedule,
  getTimetable,
} from "@/lib/scheduleApi";
import type {
  ConfirmScheduleResponse,
  CourseSection,
  ScheduleGenerationRequest,
  ScheduleGenerationResponse,
  ScheduleGenerationRun,
  ScheduleOption,
  TimetableSlot,
} from "@/types/schedule";

const makeCourseSection = (id = "section-1"): CourseSection => ({
  id,
  nrc: "NRC-001",
  courseId: "course-1",
  courseCode: "INF-101",
  courseName: "Programación I",
  teacherId: "teacher-1",
  teacherName: "Docente Uno",
  classroomId: "classroom-1",
  classroomCode: "A-101",
  timeSlots: [{ day: "MONDAY", startTime: "07:00", endTime: "08:30" }],
});

const makeScheduleGenerationRun = (id = "run-1"): ScheduleGenerationRun => ({
  solverRunId: id,
  runType: "TEACHER",
  academicPeriodId: "period-1",
  teachingScheduleId: null,
  status: "SUCCEEDED",
  seed: 42,
  summary: "Generación exitosa",
  startedAt: "2024-01-01T08:00:00Z",
  finishedAt: "2024-01-01T08:05:00Z",
  createdAt: "2024-01-01T07:59:00Z",
  conflicts: [],
});

const makeScheduleOption = (id = "schedule-1"): ScheduleOption => ({
  id,
  academicPeriodId: "period-1",
  status: "DRAFT",
  createdBy: "user-1",
  createdAt: "2024-01-01T08:00:00Z",
  updatedAt: "2024-01-01T08:00:00Z",
  confirmedAt: null,
  solverRunId: "run-1",
  seed: 42,
  offerCount: 10,
  slotCount: 25,
});

const makeTimetableSlot = (slotId = "slot-1"): TimetableSlot => ({
  slotId,
  classroomId: "classroom-1",
  classroomCode: "A-101",
  classroomName: "Aula 101",
  classroomType: "THEORY",
  teacherId: "teacher-1",
  teacherCode: "DOC-01",
  teacherName: "Docente Uno",
  courseId: "course-1",
  courseCode: "INF-101",
  courseName: "Programación I",
  componentType: "THEORY",
  sectionId: "section-1",
  nrc: "NRC-001",
  sectionNumber: 1,
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  endTime: "08:30",
});

describe("scheduleApi — integración", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getSectionsBySchedule — GET /api/schedules/:id/sections", async () => {
    const sections = [makeCourseSection()];
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: sections });

    await expect(getSectionsBySchedule("schedule-1")).resolves.toEqual(sections);
    expect(spy).toHaveBeenCalledWith("/api/schedules/schedule-1/sections");
  });

  it("generateScheduleOption — POST /api/schedules/generations con payload", async () => {
    const response: ScheduleGenerationResponse = {
      solverRunId: "run-1",
      reservationId: "res-1",
      seed: 42,
      remaining: 3,
      status: "PENDING",
      websocketUrl: "ws://localhost/api/schedules/ws/run-1",
    };
    const spy = vi.spyOn(api, "post").mockResolvedValue({ data: response });
    const payload: ScheduleGenerationRequest = {
      academicPeriodId: "period-1",
      classroomIds: ["classroom-1", "classroom-2"],
      timeLimitMs: 5000,
    };

    await expect(generateScheduleOption(payload)).resolves.toEqual(response);
    expect(spy).toHaveBeenCalledWith("/api/schedules/generations", payload);
  });

  it("getScheduleOptions — GET /api/schedules/options con academicPeriodId", async () => {
    const options = [makeScheduleOption()];
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: options });

    await expect(getScheduleOptions("period-1")).resolves.toEqual(options);
    expect(spy).toHaveBeenCalledWith("/api/schedules/options", { params: { academicPeriodId: "period-1" } });
  });

  it("getScheduleGenerationRun — GET /api/schedules/generations/:runId", async () => {
    const run = makeScheduleGenerationRun();
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: run });

    await expect(getScheduleGenerationRun("run-1")).resolves.toEqual(run);
    expect(spy).toHaveBeenCalledWith("/api/schedules/generations/run-1");
  });

  it("getScheduleGenerationRun — propaga estado FAILED con conflictos", async () => {
    const run: ScheduleGenerationRun = {
      ...makeScheduleGenerationRun(),
      status: "FAILED",
      conflicts: [
        {
          conflictType: "NO_FEASIBLE_SOLUTION",
          resourceType: null,
          resourceId: null,
          courseId: null,
          timeSlotId: null,
          message: "Sin solución factible",
          createdAt: "2024-01-01T08:05:00Z",
        },
      ],
    };
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: run });

    const result = await getScheduleGenerationRun("run-1");
    expect(result.status).toBe("FAILED");
    expect(result.conflicts).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith("/api/schedules/generations/run-1");
  });

  it("confirmScheduleOption — POST /api/schedules/:id/confirm", async () => {
    const response: ConfirmScheduleResponse = { scheduleId: "schedule-1", status: "CONFIRMED" };
    const spy = vi.spyOn(api, "post").mockResolvedValue({ data: response });

    await expect(confirmScheduleOption("schedule-1")).resolves.toEqual(response);
    expect(spy).toHaveBeenCalledWith("/api/schedules/schedule-1/confirm");
  });

  it("getTimetable — GET /api/schedules/:id/timetable", async () => {
    const slots = [makeTimetableSlot()];
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: slots });

    await expect(getTimetable("schedule-1")).resolves.toEqual(slots);
    expect(spy).toHaveBeenCalledWith("/api/schedules/schedule-1/timetable");
  });

  it("getTimetable — retorna lista vacía cuando no hay franjas", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

    await expect(getTimetable("schedule-empty")).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledWith("/api/schedules/schedule-empty/timetable");
  });

  it("cancelScheduleOption — DELETE /api/schedules/:id con suppressGlobalErrorToast", async () => {
    const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: undefined });

    await expect(cancelScheduleOption("schedule-1")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("/api/schedules/schedule-1", {
      suppressGlobalErrorToast: true,
    });
  });
});
