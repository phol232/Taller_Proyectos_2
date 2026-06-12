import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import type {
  AcademicPeriodAdmin,
  CarreraAdmin,
  ClassroomAdmin,
  CourseAdmin,
  FacultadAdmin,
  PagedResult,
  StudentAdmin,
  TeacherAdmin,
  UserAdmin,
} from "@/types/admin";

const makeUser = (id = "user-1"): UserAdmin => ({
  id,
  email: "admin@test.com",
  passwordHash: null,
  fullName: "Admin Test",
  role: "ADMIN",
  active: true,
  emailVerified: true,
  avatarUrl: null,
  createdAt: null,
  updatedAt: null,
});

const makePaged = <T>(items: T[]): PagedResult<T> => ({
  content: items,
  page: 1,
  pageSize: 12,
  totalCount: items.length,
  totalPages: 1,
});

const makeCourse = (id = "course-1"): CourseAdmin => ({
  id,
  code: "INF-101",
  name: "Programación I",
  cycle: 1,
  credits: 4,
  requiredCredits: 0,
  weeklyHours: 4,
  requiredRoomType: null,
  isActive: true,
  prerequisites: [],
  createdAt: null,
  updatedAt: null,
});

const makeTeacher = (id = "teacher-1"): TeacherAdmin => ({
  id,
  userId: null,
  code: "DOC-01",
  fullName: "Docente Uno",
  email: null,
  specialty: "Computación",
  isActive: true,
  availability: [],
  courseCodes: [],
  courseComponentIds: [],
  createdAt: null,
  updatedAt: null,
});

const makeClassroom = (id = "classroom-1"): ClassroomAdmin => ({
  id,
  code: "A-101",
  name: "Aula 101",
  capacity: 30,
  type: "THEORY",
  isActive: true,
  availability: [],
  courseCodes: [],
  courseComponentIds: [],
  createdAt: null,
  updatedAt: null,
});

const makeStudent = (id = "student-1"): StudentAdmin => ({
  id,
  userId: null,
  code: "2021-001",
  fullName: "Estudiante Uno",
  email: null,
  cycle: 3,
  career: "Ingeniería de Sistemas",
  facultadId: null,
  carreraId: null,
  creditLimit: 20,
  isActive: true,
  approvedCourses: [],
  createdAt: null,
  updatedAt: null,
});

const makeAcademicPeriod = (id = "period-1"): AcademicPeriodAdmin => ({
  id,
  code: "2024-I",
  name: "Semestre 2024-I",
  startsAt: "2024-03-01",
  endsAt: "2024-07-31",
  status: "ACTIVE",
  maxStudentCredits: 20,
  isActive: true,
  createdAt: null,
  updatedAt: null,
});

const makeFacultad = (id = "fac-1"): FacultadAdmin => ({
  id,
  code: "FISI",
  name: "Facultad de Ingeniería de Sistemas",
  isActive: true,
  createdAt: null,
  updatedAt: null,
});

const makeCarrera = (id = "car-1"): CarreraAdmin => ({
  id,
  facultadId: "fac-1",
  code: "IS",
  name: "Ingeniería de Sistemas",
  isActive: true,
  createdAt: null,
  updatedAt: null,
});

describe("adminApi — integración", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getApiErrorMessage", () => {
    it("extrae mensaje de la respuesta del servidor", () => {
      const error = { response: { data: { message: "Ya existe" } } };
      expect(getApiErrorMessage(error, "fallback")).toBe("Ya existe");
    });

    it("usa mensaje de axios cuando no hay data de respuesta", () => {
      const error = { message: "Network Error" };
      expect(getApiErrorMessage(error, "fallback")).toBe("Network Error");
    });

    it("usa fallback cuando no hay mensaje disponible", () => {
      expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
    });
  });

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  describe("usuarios", () => {
    it("listUsers — GET /api/users con paginación por defecto", async () => {
      const users = makePaged([makeUser()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: users });

      await expect(adminApi.listUsers()).resolves.toEqual(users);
      expect(spy).toHaveBeenCalledWith("/api/users", { params: { page: 1, pageSize: 12 } });
    });

    it("listUsers — GET /api/users con página personalizada", async () => {
      const users = makePaged([makeUser()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: users });

      await expect(adminApi.listUsers(3)).resolves.toEqual(users);
      expect(spy).toHaveBeenCalledWith("/api/users", { params: { page: 3, pageSize: 12 } });
    });

    it("searchUsers — GET /api/users/search con query y página", async () => {
      const users = makePaged([makeUser()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: users });

      await expect(adminApi.searchUsers("Admin", 2)).resolves.toEqual(users);
      expect(spy).toHaveBeenCalledWith("/api/users/search", {
        params: { q: "Admin", page: 2, pageSize: 12 },
      });
    });

    it("createUser — POST /api/users con payload completo", async () => {
      const user = makeUser();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: user });
      const payload = {
        email: "nuevo@test.com",
        password: "pass123",
        fullName: "Nuevo Usuario",
        role: "STUDENT" as const,
        active: true,
        emailVerified: false,
      };

      await expect(adminApi.createUser(payload)).resolves.toEqual(user);
      expect(spy).toHaveBeenCalledWith("/api/users", payload);
    });

    it("activateUser — POST /api/users/:id/activate", async () => {
      const user = makeUser();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: user });

      await expect(adminApi.activateUser("user-1")).resolves.toEqual(user);
      expect(spy).toHaveBeenCalledWith("/api/users/user-1/activate");
    });

    it("deactivateUser — POST /api/users/:id/deactivate", async () => {
      const user = { ...makeUser(), active: false };
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: user });

      await expect(adminApi.deactivateUser("user-1")).resolves.toEqual(user);
      expect(spy).toHaveBeenCalledWith("/api/users/user-1/deactivate");
    });
  });

  // ─── Cursos ───────────────────────────────────────────────────────────────

  describe("cursos", () => {
    it("listCourses — GET /api/courses con paginación", async () => {
      const courses = makePaged([makeCourse()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: courses });

      await expect(adminApi.listCourses(1, 12)).resolves.toEqual(courses);
      expect(spy).toHaveBeenCalledWith("/api/courses", { params: { page: 1, pageSize: 12 } });
    });

    it("searchCourses — GET /api/courses/search", async () => {
      const courses = makePaged([makeCourse()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: courses });

      await expect(adminApi.searchCourses("Progra", 1, 12)).resolves.toEqual(courses);
      expect(spy).toHaveBeenCalledWith("/api/courses/search", {
        params: { q: "Progra", page: 1, pageSize: 12 },
      });
    });

    it("findCoursesByCodes — POST /api/courses/by-codes con array de códigos", async () => {
      const courses = [makeCourse()];
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: courses });

      await expect(adminApi.findCoursesByCodes(["INF-101", "INF-102"])).resolves.toEqual(courses);
      expect(spy).toHaveBeenCalledWith("/api/courses/by-codes", ["INF-101", "INF-102"]);
    });

    it("findCoursesByCodes — retorna [] y no llama a la API cuando codes es vacío", async () => {
      const spy = vi.spyOn(api, "post");

      await expect(adminApi.findCoursesByCodes([])).resolves.toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    it("createCourse — POST /api/courses con payload", async () => {
      const course = makeCourse();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: course });

      await expect(adminApi.createCourse({ code: "INF-101", name: "Programación I" })).resolves.toEqual(course);
      expect(spy).toHaveBeenCalledWith("/api/courses", { code: "INF-101", name: "Programación I" });
    });

    it("updateCourse — PUT /api/courses/:id con payload parcial", async () => {
      const course = makeCourse();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: course });

      await expect(adminApi.updateCourse("course-1", { name: "Programación Avanzada" })).resolves.toEqual(course);
      expect(spy).toHaveBeenCalledWith("/api/courses/course-1", { name: "Programación Avanzada" });
    });

    it("deactivateCourse — POST /api/courses/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateCourse("course-1");
      expect(spy).toHaveBeenCalledWith("/api/courses/course-1/deactivate");
    });

    it("deleteCourse — DELETE /api/courses/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteCourse("course-1");
      expect(spy).toHaveBeenCalledWith("/api/courses/course-1");
    });
  });

  // ─── Docentes ─────────────────────────────────────────────────────────────

  describe("docentes", () => {
    it("listTeachers — GET /api/teachers con paginación", async () => {
      const teachers = makePaged([makeTeacher()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: teachers });

      await expect(adminApi.listTeachers(1)).resolves.toEqual(teachers);
      expect(spy).toHaveBeenCalledWith("/api/teachers", { params: { page: 1, pageSize: 12 } });
    });

    it("searchTeachers — GET /api/teachers/search con query", async () => {
      const teachers = makePaged([makeTeacher()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: teachers });

      await expect(adminApi.searchTeachers("Docente", 2)).resolves.toEqual(teachers);
      expect(spy).toHaveBeenCalledWith("/api/teachers/search", {
        params: { q: "Docente", page: 2, pageSize: 12 },
      });
    });

    it("createTeacher — POST /api/teachers", async () => {
      const teacher = makeTeacher();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: teacher });

      await expect(adminApi.createTeacher({ code: "DOC-01", fullName: "Docente Uno" })).resolves.toEqual(teacher);
      expect(spy).toHaveBeenCalledWith("/api/teachers", { code: "DOC-01", fullName: "Docente Uno" });
    });

    it("updateTeacher — PUT /api/teachers/:id", async () => {
      const teacher = makeTeacher();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: teacher });

      await expect(adminApi.updateTeacher("teacher-1", { specialty: "Redes" })).resolves.toEqual(teacher);
      expect(spy).toHaveBeenCalledWith("/api/teachers/teacher-1", { specialty: "Redes" });
    });

    it("deactivateTeacher — POST /api/teachers/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateTeacher("teacher-1");
      expect(spy).toHaveBeenCalledWith("/api/teachers/teacher-1/deactivate");
    });

    it("deleteTeacher — DELETE /api/teachers/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteTeacher("teacher-1");
      expect(spy).toHaveBeenCalledWith("/api/teachers/teacher-1");
    });
  });

  // ─── Aulas ────────────────────────────────────────────────────────────────

  describe("aulas", () => {
    it("listClassrooms — GET /api/classrooms con paginación", async () => {
      const classrooms = makePaged([makeClassroom()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: classrooms });

      await expect(adminApi.listClassrooms(1, 12)).resolves.toEqual(classrooms);
      expect(spy).toHaveBeenCalledWith("/api/classrooms", { params: { page: 1, pageSize: 12 } });
    });

    it("searchClassrooms — GET /api/classrooms/search", async () => {
      const classrooms = makePaged([makeClassroom()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: classrooms });

      await expect(adminApi.searchClassrooms("Aula", 1)).resolves.toEqual(classrooms);
      expect(spy).toHaveBeenCalledWith("/api/classrooms/search", {
        params: { q: "Aula", page: 1, pageSize: 12 },
      });
    });

    it("createClassroom — POST /api/classrooms", async () => {
      const classroom = makeClassroom();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: classroom });

      await expect(adminApi.createClassroom({ code: "A-101", name: "Aula 101", capacity: 30, type: "THEORY" })).resolves.toEqual(classroom);
      expect(spy).toHaveBeenCalledWith("/api/classrooms", { code: "A-101", name: "Aula 101", capacity: 30, type: "THEORY" });
    });

    it("updateClassroom — PUT /api/classrooms/:id", async () => {
      const classroom = makeClassroom();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: classroom });

      await expect(adminApi.updateClassroom("classroom-1", { capacity: 50 })).resolves.toEqual(classroom);
      expect(spy).toHaveBeenCalledWith("/api/classrooms/classroom-1", { capacity: 50 });
    });

    it("deactivateClassroom — POST /api/classrooms/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateClassroom("classroom-1");
      expect(spy).toHaveBeenCalledWith("/api/classrooms/classroom-1/deactivate");
    });

    it("deleteClassroom — DELETE /api/classrooms/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteClassroom("classroom-1");
      expect(spy).toHaveBeenCalledWith("/api/classrooms/classroom-1");
    });
  });

  // ─── Estudiantes ──────────────────────────────────────────────────────────

  describe("estudiantes", () => {
    it("listStudents — GET /api/students con paginación", async () => {
      const students = makePaged([makeStudent()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: students });

      await expect(adminApi.listStudents(1)).resolves.toEqual(students);
      expect(spy).toHaveBeenCalledWith("/api/students", { params: { page: 1, pageSize: 12 } });
    });

    it("searchStudents — GET /api/students/search", async () => {
      const students = makePaged([makeStudent()]);
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: students });

      await expect(adminApi.searchStudents("Estudiante", 1)).resolves.toEqual(students);
      expect(spy).toHaveBeenCalledWith("/api/students/search", {
        params: { q: "Estudiante", page: 1, pageSize: 12 },
      });
    });

    it("createStudent — POST /api/students", async () => {
      const student = makeStudent();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: student });

      await expect(adminApi.createStudent({ code: "2021-001", fullName: "Estudiante Uno" })).resolves.toEqual(student);
      expect(spy).toHaveBeenCalledWith("/api/students", { code: "2021-001", fullName: "Estudiante Uno" });
    });

    it("updateStudent — PUT /api/students/:id", async () => {
      const student = makeStudent();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: student });

      await expect(adminApi.updateStudent("student-1", { cycle: 5 })).resolves.toEqual(student);
      expect(spy).toHaveBeenCalledWith("/api/students/student-1", { cycle: 5 });
    });

    it("deactivateStudent — POST /api/students/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateStudent("student-1");
      expect(spy).toHaveBeenCalledWith("/api/students/student-1/deactivate");
    });

    it("deleteStudent — DELETE /api/students/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteStudent("student-1");
      expect(spy).toHaveBeenCalledWith("/api/students/student-1");
    });
  });

  // ─── Periodos Académicos ──────────────────────────────────────────────────

  describe("periodos académicos", () => {
    it("listAcademicPeriods — GET /api/academic-periods", async () => {
      const periods = [makeAcademicPeriod()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: periods });

      await expect(adminApi.listAcademicPeriods()).resolves.toEqual(periods);
      expect(spy).toHaveBeenCalledWith("/api/academic-periods");
    });

    it("searchAcademicPeriods — GET /api/academic-periods/search con query", async () => {
      const periods = [makeAcademicPeriod()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: periods });

      await expect(adminApi.searchAcademicPeriods("2024")).resolves.toEqual(periods);
      expect(spy).toHaveBeenCalledWith("/api/academic-periods/search", { params: { q: "2024" } });
    });

    it("createAcademicPeriod — POST /api/academic-periods", async () => {
      const period = makeAcademicPeriod();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: period });

      await expect(adminApi.createAcademicPeriod({ code: "2024-I", name: "Semestre 2024-I" })).resolves.toEqual(period);
      expect(spy).toHaveBeenCalledWith("/api/academic-periods", { code: "2024-I", name: "Semestre 2024-I" });
    });

    it("updateAcademicPeriod — PUT /api/academic-periods/:id", async () => {
      const period = makeAcademicPeriod();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: period });

      await expect(adminApi.updateAcademicPeriod("period-1", { maxStudentCredits: 22 })).resolves.toEqual(period);
      expect(spy).toHaveBeenCalledWith("/api/academic-periods/period-1", { maxStudentCredits: 22 });
    });

    it("activateAcademicPeriod — POST /api/academic-periods/:id/activate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.activateAcademicPeriod("period-1");
      expect(spy).toHaveBeenCalledWith("/api/academic-periods/period-1/activate");
    });

    it("deactivateAcademicPeriod — POST /api/academic-periods/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateAcademicPeriod("period-1");
      expect(spy).toHaveBeenCalledWith("/api/academic-periods/period-1/deactivate");
    });

    it("deleteAcademicPeriod — DELETE /api/academic-periods/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteAcademicPeriod("period-1");
      expect(spy).toHaveBeenCalledWith("/api/academic-periods/period-1");
    });
  });

  // ─── Facultades y Carreras ────────────────────────────────────────────────

  describe("facultades y carreras", () => {
    it("listCatalogFacultades — GET /api/catalog/facultades", async () => {
      const facultades = [makeFacultad()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: facultades });

      await expect(adminApi.listCatalogFacultades()).resolves.toEqual(facultades);
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades");
    });

    it("listCatalogCarreras — GET /api/catalog/carreras con facultadId", async () => {
      const carreras = [makeCarrera()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: carreras });

      await expect(adminApi.listCatalogCarreras("fac-1")).resolves.toEqual(carreras);
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras", { params: { facultadId: "fac-1" } });
    });

    it("listCatalogCarreras — GET /api/catalog/carreras sin parámetros cuando no hay facultadId", async () => {
      const carreras = [makeCarrera()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: carreras });

      await expect(adminApi.listCatalogCarreras()).resolves.toEqual(carreras);
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras", { params: undefined });
    });

    it("listAllFacultades — GET /api/catalog/facultades/all", async () => {
      const facultades = [makeFacultad()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: facultades });

      await expect(adminApi.listAllFacultades()).resolves.toEqual(facultades);
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades/all");
    });

    it("listAllCarrerasByFacultad — GET /api/catalog/facultades/:id/carreras/all", async () => {
      const carreras = [makeCarrera()];
      const spy = vi.spyOn(api, "get").mockResolvedValue({ data: carreras });

      await expect(adminApi.listAllCarrerasByFacultad("fac-1")).resolves.toEqual(carreras);
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades/fac-1/carreras/all");
    });

    it("createFacultad — POST /api/catalog/facultades", async () => {
      const facultad = makeFacultad();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: facultad });

      await expect(adminApi.createFacultad({ code: "FISI", name: "Facultad de Ingeniería" })).resolves.toEqual(facultad);
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades", { code: "FISI", name: "Facultad de Ingeniería" });
    });

    it("updateFacultad — PUT /api/catalog/facultades/:id", async () => {
      const facultad = makeFacultad();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: facultad });

      await expect(adminApi.updateFacultad("fac-1", { code: "FISI", name: "Actualizada", isActive: true })).resolves.toEqual(facultad);
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades/fac-1", {
        code: "FISI",
        name: "Actualizada",
        isActive: true,
      });
    });

    it("deactivateFacultad — POST /api/catalog/facultades/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateFacultad("fac-1");
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades/fac-1/deactivate");
    });

    it("deleteFacultad — DELETE /api/catalog/facultades/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteFacultad("fac-1");
      expect(spy).toHaveBeenCalledWith("/api/catalog/facultades/fac-1");
    });

    it("createCarrera — POST /api/catalog/carreras", async () => {
      const carrera = makeCarrera();
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: carrera });

      await expect(adminApi.createCarrera({ facultadId: "fac-1", code: "IS", name: "Ingeniería de Sistemas" })).resolves.toEqual(carrera);
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras", {
        facultadId: "fac-1",
        code: "IS",
        name: "Ingeniería de Sistemas",
      });
    });

    it("updateCarrera — PUT /api/catalog/carreras/:id", async () => {
      const carrera = makeCarrera();
      const spy = vi.spyOn(api, "put").mockResolvedValue({ data: carrera });

      await expect(
        adminApi.updateCarrera("car-1", { facultadId: "fac-1", code: "IS", name: "Actualizada", isActive: true }),
      ).resolves.toEqual(carrera);
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras/car-1", {
        facultadId: "fac-1",
        code: "IS",
        name: "Actualizada",
        isActive: true,
      });
    });

    it("deactivateCarrera — POST /api/catalog/carreras/:id/deactivate", async () => {
      const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} });

      await adminApi.deactivateCarrera("car-1");
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras/car-1/deactivate");
    });

    it("deleteCarrera — DELETE /api/catalog/carreras/:id", async () => {
      const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });

      await adminApi.deleteCarrera("car-1");
      expect(spy).toHaveBeenCalledWith("/api/catalog/carreras/car-1");
    });
  });
});
