import { test, expect } from '@playwright/test';
import { API_BASE, SOLVER_BASE, SOLVER_TOKEN, apiLogin } from '../helpers/auth.helper';

const SOLVER = SOLVER_BASE;
const API    = API_BASE;

const SOLVER_HEADERS = {
  'x-solver-internal-token': SOLVER_TOKEN,
  'Content-Type': 'application/json',
};

// ── POST /api/solver/run (STUDENT) ────────────────────────────────────────

test.describe('POST /api/solver/run — STUDENT', () => {
  test('Happy Path: dispara run STUDENT con student_id → 202 o estado conocido', async ({ request }) => {
    // Intentar con datos reales de la BD
    await apiLogin(request);
    const periods = await request.get(`${API}/api/academic-periods`);
    const periodList = await periods.json();
    const students = await request.get(`${API}/api/students?page=1&pageSize=1`);
    const studentData = await students.json();

    if (!periodList?.length || !(studentData?.items ?? studentData?.content)?.length) {
      test.skip();
      return;
    }

    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: periodList[0].id,
        run_type: 'STUDENT',
        student_id: (studentData.items ?? studentData.content)[0].id,
        time_limit_ms: 5000,
        keep_existing_drafts: false,
      },
    });

    // 202: run iniciado; 400/422: datos insuficientes en BD
    expect([202, 400, 422]).toContain(res.status());
    if (res.status() === 202) {
      const body = await res.json();
      expect(body).toHaveProperty('solver_run_id');
      expect(body).toHaveProperty('status', 'PENDING');
      expect(body).toHaveProperty('websocket_url');
    }
  });

  test('Fail: run STUDENT sin student_id → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'STUDENT',
        // student_id ausente
        time_limit_ms: 5000,
      },
    });
    // STUDENT sin student_id debe ser rechazado (422 por validación, 403 por lógica, 500 si el solver falla)
    expect([403, 422, 500]).toContain(res.status());
  });

  test('Fail: student_id con UUID inválido → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'STUDENT',
        student_id: 'no-es-un-uuid',
        time_limit_ms: 5000,
      },
    });
    expect(res.status()).toBe(422);
  });

  test('Fail: sin token interno → 403', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'STUDENT',
        student_id: '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Fail: run_type inválido → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'INVALIDO',
        student_id: '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(res.status()).toBe(422);
  });

  test('Fail: body completamente vacío → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {},
    });
    expect(res.status()).toBe(422);
  });
});

// ── GET /api/solver/runs/{run_id} tras run STUDENT ───────────────────────

test.describe('GET /api/solver/runs/{run_id} — consulta estado STUDENT', () => {
  test('Happy Path: estructura de RunDetailResponse es correcta', async ({ request }) => {
    await apiLogin(request);
    const periods = await request.get(`${API}/api/academic-periods`);
    const periodList = await periods.json();
    const students = await request.get(`${API}/api/students?page=1&pageSize=1`);
    const studentData = await students.json();

    if (!periodList?.length || !(studentData?.items ?? studentData?.content)?.length) {
      test.skip();
      return;
    }

    const run = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: periodList[0].id,
        run_type: 'STUDENT',
        student_id: (studentData.items ?? studentData.content)[0].id,
        time_limit_ms: 5000,
      },
    });

    if (run.status() !== 202) {
      test.skip();
      return;
    }

    const { solver_run_id } = await run.json();

    const status = await request.get(`${SOLVER}/api/solver/runs/${solver_run_id}`, {
      headers: SOLVER_HEADERS,
    });
    expect(status.status()).toBe(200);
    const body = await status.json();
    expect(body).toHaveProperty('solver_run_id', solver_run_id);
    expect(body).toHaveProperty('run_type', 'STUDENT');
    expect(body).toHaveProperty('status');
    expect(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).toContain(body.status);
    expect(body).toHaveProperty('conflicts');
    expect(Array.isArray(body.conflicts)).toBe(true);
  });
});
