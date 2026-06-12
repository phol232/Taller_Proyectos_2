import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  getCurrentStudent,
  getStudentActiveSchedule,
  getStudentAvailableCourses,
} from "@/lib/studentScheduleApi";
import type {
  ActiveStudentSchedule,
  StudentMe,
  StudentPendingCourse,
} from "@/types/studentSchedule";

const makeStudentMe = (id = "student-1"): StudentMe => ({
  id,
  userId: "user-1",
  code: "2021-001",
  fullName: "Estudiante Test",
  cycle: 3,
  creditLimit: 20,
  carreraId: "car-1",
  facultadId: "fac-1",
});

const makeStudentPendingCourse = (courseId = "course-1"): StudentPendingCourse => ({
  courseId,
  courseCode: "INF-101",
  courseName: "Programación I",
  courseCycle: 1,
  courseCredits: 4,
  courseWeeklyHours: 4,
  requiredComponents: 1,
  sections: [
    {
      sectionId: "section-1",
      nrc: "NRC-001",
      sectionNumber: 1,
      components: [
        {
          assignmentId: "assignment-1",
          courseComponentId: "component-1",
          componentType: "THEORY",
          componentWeeklyHours: 4,
          teacherId: "teacher-1",
          teacherCode: "DOC-01",
          teacherName: "Docente Uno",
          slots: [
            {
              slotId: "slot-1",
              timeSlotId: "timeslot-1",
              dayOfWeek: "MONDAY",
              startTime: "07:00",
              endTime: "08:30",
              classroomId: "classroom-1",
              classroomCode: "A-101",
              classroomName: "Aula 101",
            },
          ],
        },
      ],
    },
  ],
});

const makeActiveSchedule = (scheduleId = "schedule-1"): ActiveStudentSchedule => ({
  scheduleId,
  status: "DRAFT",
  items: [
    {
      studentScheduleItemId: "item-1",
      courseId: "course-1",
      components: [
        {
          courseComponentId: "component-1",
          courseAssignmentId: "assignment-1",
        },
      ],
    },
  ],
});

describe("studentScheduleApi — integración", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentStudent", () => {
    it("GET /api/students/me — retorna datos del estudiante autenticado", async () => {
      const student = makeStudentMe();
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: student });

      await expect(getCurrentStudent()).resolves.toEqual(student);
      expect(spy).toHaveBeenCalledWith("/api/students/me");
    });

    it("GET /api/students/me — retorna estudiante sin carrera ni facultad asignadas", async () => {
      const student: StudentMe = { ...makeStudentMe(), carreraId: null, facultadId: null };
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: student });

      const result = await getCurrentStudent();
      expect(result.carreraId).toBeNull();
      expect(result.facultadId).toBeNull();
      expect(spy).toHaveBeenCalledWith("/api/students/me");
    });

    it("GET /api/students/me — propaga el error cuando no está autenticado", async () => {
      const error = new Error("Unauthorized");
      vi.spyOn(api, "get").mockRejectedValue(error);

      await expect(getCurrentStudent()).rejects.toThrow("Unauthorized");
    });
  });

  describe("getStudentAvailableCourses", () => {
    it("GET /api/students/:id/available-courses con periodId", async () => {
      const courses = [makeStudentPendingCourse()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: courses });

      await expect(getStudentAvailableCourses("student-1", "period-1")).resolves.toEqual(courses);
      expect(spy).toHaveBeenCalledWith("/api/students/student-1/available-courses", {
        params: { periodId: "period-1" },
      });
    });

    it("retorna lista vacía cuando el estudiante no tiene cursos disponibles", async () => {
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: [] });

      await expect(getStudentAvailableCourses("student-1", "period-1")).resolves.toEqual([]);
      expect(spy).toHaveBeenCalledWith("/api/students/student-1/available-courses", {
        params: { periodId: "period-1" },
      });
    });

    it("retorna múltiples cursos disponibles con sus secciones", async () => {
      const courses = [
        makeStudentPendingCourse("course-1"),
        makeStudentPendingCourse("course-2"),
      ];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: courses });

      const result = await getStudentAvailableCourses("student-1", "period-1");
      expect(result).toHaveLength(2);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStudentActiveSchedule", () => {
    it("GET /api/students/:id/schedule — retorna horario activo (200)", async () => {
      const schedule = makeActiveSchedule();
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: schedule, status: 200 });

      await expect(getStudentActiveSchedule("student-1", "period-1")).resolves.toEqual(schedule);
      expect(spy).toHaveBeenCalledWith(
        "/api/students/student-1/schedule",
        expect.objectContaining({ params: { periodId: "period-1" } }),
      );
    });

    it("GET /api/students/:id/schedule — retorna null cuando no hay horario activo (204)", async () => {
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: undefined, status: 204 });

      await expect(getStudentActiveSchedule("student-1", "period-1")).resolves.toBeNull();
      expect(spy).toHaveBeenCalledWith(
        "/api/students/student-1/schedule",
        expect.objectContaining({ params: { periodId: "period-1" } }),
      );
    });

    it("envía suppressGlobalErrorToast para manejar 204 sin toast de error", async () => {
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: undefined, status: 204 });

      await getStudentActiveSchedule("student-1", "period-1");
      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ suppressGlobalErrorToast: true }),
      );
    });

    it("retorna horario confirmado correctamente", async () => {
      const schedule: ActiveStudentSchedule = { ...makeActiveSchedule(), status: "CONFIRMED" };
      vi.spyOn(api, "get").mockResolvedValue({ data: schedule, status: 200 });

      const result = await getStudentActiveSchedule("student-1", "period-1");
      expect(result?.status).toBe("CONFIRMED");
    });
  });
});
