import { APIRequestContext } from '@playwright/test';
import { API_BASE } from './auth.helper';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ── Academic Period ────────────────────────────────────────────────────────

export async function createAcademicPeriod(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/academic-periods`, {
    data: {
      code: `TEST-${uid()}`,
      name: `Periodo Test ${uid()}`,
      startsAt: '2026-03-01',
      endsAt: '2026-07-31',
      status: 'PLANNING',
      maxStudentCredits: 20,
      isActive: true,
      ...overrides,
    },
  });
}

// ── Catalog ────────────────────────────────────────────────────────────────

export async function createFacultad(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/catalog/facultades`, {
    data: {
      code: `FAC${uid()}`,
      name: `Facultad Test ${uid()}`,
      isActive: true,
      ...overrides,
    },
  });
}

export async function createCarrera(
  request: APIRequestContext,
  facultadId: string,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/catalog/carreras`, {
    data: {
      facultadId,
      code: `CAR${uid()}`,
      name: `Carrera Test ${uid()}`,
      isActive: true,
      ...overrides,
    },
  });
}

// ── Classroom ──────────────────────────────────────────────────────────────

export async function createClassroom(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/classrooms`, {
    data: {
      code: `AULA-${uid()}`,
      name: `Aula Test ${uid()}`,
      capacity: 30,
      type: 'AULA',
      isActive: true,
      availability: [],
      courseCodes: [],
      courseComponentIds: [],
      ...overrides,
    },
  });
}

// ── Course ─────────────────────────────────────────────────────────────────

export async function createCourse(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/courses`, {
    data: {
      code: `CUR-${uid()}`,
      name: `Curso Test ${uid()}`,
      cycle: 3,
      credits: 3,
      requiredCredits: 0,
      weeklyHours: 3.0,
      requiredRoomType: 'AULA',
      isActive: true,
      components: [],
      prerequisites: [],
      ...overrides,
    },
  });
}

// ── Teacher ────────────────────────────────────────────────────────────────

export async function createTeacher(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/teachers`, {
    data: {
      code: `DOC-${uid()}`,
      fullName: `Docente Test ${uid()}`,
      specialty: 'Ingeniería de Sistemas',
      isActive: true,
      availability: [],
      courseCodes: [],
      courseComponentIds: [],
      ...overrides,
    },
  });
}

// ── Student ────────────────────────────────────────────────────────────────

export async function createStudent(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/students`, {
    data: {
      code: `EST-${uid()}`,
      fullName: `Estudiante Test ${uid()}`,
      cycle: 3,
      career: 'Ingeniería de Sistemas',
      creditLimit: 18,
      isActive: true,
      approvedCourses: [],
      ...overrides,
    },
  });
}

// ── User ───────────────────────────────────────────────────────────────────

export async function createUser(
  request: APIRequestContext,
  overrides?: Record<string, unknown>,
) {
  return request.post(`${API_BASE}/api/users`, {
    data: {
      email: `test.e2e.${uid()}@continental.edu.pe`,
      password: 'TestPass123!',
      fullName: `Usuario Test ${uid()}`,
      role: 'STUDENT',
      active: true,
      emailVerified: true,
      ...overrides,
    },
  });
}
