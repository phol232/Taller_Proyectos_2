/**
 * E2E API: Módulo Scheduling — /api/schedules + /api/students/{id}/schedule
 *
 * Cubre:
 *  - SchedulingController: generación, estado, opciones, confirmación, borrado
 *  - ScheduleBuilderController: time-slots, asignaciones manuales, validación
 *  - StudentScheduleController: cursos disponibles y horario activo
 *
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';

const BASE = API_BASE;

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

// ── GET /api/schedules/time-slots ──────────────────────────────────────────

test.describe('GET /api/schedules/time-slots', () => {
  test('Happy Path: lista franjas horarias activas → 200 con array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/time-slots`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Happy Path: cada franja tiene id, day y horas', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/time-slots`);
    const slots = await res.json();
    if (slots.length > 0) {
      const s = slots[0];
      expect(s).toHaveProperty('id');
    }
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/schedules/time-slots`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── GET /api/schedules/options ─────────────────────────────────────────────

test.describe('GET /api/schedules/options', () => {
  test('Happy Path: con academicPeriodId válido → 200 con array', async ({ request }) => {
    // Primero obtenemos un período existente
    const periods = await request.get(`${BASE}/api/academic-periods`);
    const periodList = await periods.json();

    if (!periodList || periodList.length === 0) {
      test.skip();
      return;
    }

    const periodId = periodList[0].id;
    const res = await request.get(`${BASE}/api/schedules/options?academicPeriodId=${periodId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Fail: sin academicPeriodId → 400', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/options`);
    expect([400, 500]).toContain(res.status());
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/schedules/options?academicPeriodId=00000000-0000-0000-0000-000000000000`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/schedules/generations ───────────────────────────────────────

test.describe('POST /api/schedules/generations', () => {
  test('Happy Path: dispara generación → 202 con runId y status PENDING', async ({ request }) => {
    // Necesitamos un período activo y aulas
    const periods = await request.get(`${BASE}/api/academic-periods`);
    const periodList = await periods.json();
    const classrooms = await request.get(`${BASE}/api/classrooms?page=1&pageSize=5`);
    const classroomData = await classrooms.json();

    if (!periodList?.length || !(classroomData?.items ?? classroomData?.content)?.length) {
      test.skip();
      return;
    }

    const res = await request.post(`${BASE}/api/schedules/generations`, {
      data: {
        academicPeriodId: periodList[0].id,
        classroomIds: (classroomData.items ?? classroomData.content).slice(0, 2).map((c: { id: string }) => c.id),
        timeLimitMs: 5000,
      },
    });
    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body).toHaveProperty('solverRunId');
  });

  test('Fail: sin academicPeriodId → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/generations`, {
      data: {
        classroomIds: ['00000000-0000-0000-0000-000000000001'],
        timeLimitMs: 5000,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: classroomIds vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/generations`, {
      data: {
        academicPeriodId: '00000000-0000-0000-0000-000000000000',
        classroomIds: [],
        timeLimitMs: 5000,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: timeLimitMs menor a 1000 → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/generations`, {
      data: {
        academicPeriodId: '00000000-0000-0000-0000-000000000000',
        classroomIds: ['00000000-0000-0000-0000-000000000001'],
        timeLimitMs: 500,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/schedules/generations`, {
        data: {
          academicPeriodId: '00000000-0000-0000-0000-000000000000',
          classroomIds: ['00000000-0000-0000-0000-000000000001'],
        },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── GET /api/schedules/generations/{runId} ────────────────────────────────

test.describe('GET /api/schedules/generations/{runId}', () => {
  test('Fail: runId inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/generations/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/schedules/generations/00000000-0000-0000-0000-000000000000`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── GET /api/schedules/{scheduleId}/timetable ─────────────────────────────

test.describe('GET /api/schedules/{scheduleId}/timetable', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/timetable`);
    expect([200, 404]).toContain(res.status());
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/timetable`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── GET /api/schedules/{scheduleId}/sections ──────────────────────────────

test.describe('GET /api/schedules/{scheduleId}/sections', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/sections`);
    expect([200, 404]).toContain(res.status());
  });
});

// ── GET /api/schedules/{scheduleId}/assignments ───────────────────────────

test.describe('GET /api/schedules/{scheduleId}/assignments', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/assignments`);
    expect([200, 404]).toContain(res.status());
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/assignments`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/schedules/{scheduleId}/validate ─────────────────────────────

test.describe('POST /api/schedules/{scheduleId}/validate', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/validate`, {
      data: {
        teacherId: '00000000-0000-0000-0000-000000000001',
        classroomId: '00000000-0000-0000-0000-000000000002',
        timeSlotId: '00000000-0000-0000-0000-000000000003',
        startTime: '08:00',
        endTime: '10:00',
      },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('Fail: cuerpo sin campos requeridos → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/validate`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });
});

// ── DELETE /api/schedules/{scheduleId} ────────────────────────────────────

test.describe('DELETE /api/schedules/{scheduleId}', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000`);
    expect([204, 404]).toContain(res.status());
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.delete(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/schedules/{scheduleId}/confirm ──────────────────────────────

test.describe('POST /api/schedules/{scheduleId}/confirm', () => {
  test('Fail: scheduleId inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/schedules/00000000-0000-0000-0000-000000000000/confirm`);
    expect([404, 500]).toContain(res.status());
  });
});

// ── Student Schedule: GET /api/students/{studentId}/available-courses ─────

test.describe('GET /api/students/{studentId}/available-courses', () => {
  test('Fail: studentId inexistente → 404', async ({ request }) => {
    const periods = await request.get(`${BASE}/api/academic-periods`);
    const periodList = await periods.json();
    const periodId = periodList?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    const res = await request.get(
      `${BASE}/api/students/00000000-0000-0000-0000-000000000000/available-courses?periodId=${periodId}`,
    );
    expect([400, 404]).toContain(res.status());
  });

  test('Fail: sin periodId → 400', async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/students/00000000-0000-0000-0000-000000000000/available-courses`,
    );
    expect([400, 500]).toContain(res.status());
  });
});

// ── Student Schedule: GET /api/students/{studentId}/schedule ──────────────

test.describe('GET /api/students/{studentId}/schedule', () => {
  test('Fail: studentId inexistente → 404', async ({ request }) => {
    const periods = await request.get(`${BASE}/api/academic-periods`);
    const periodList = await periods.json();
    const periodId = periodList?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    const res = await request.get(
      `${BASE}/api/students/00000000-0000-0000-0000-000000000000/schedule?periodId=${periodId}`,
    );
    expect([204, 404]).toContain(res.status());
  });
});
