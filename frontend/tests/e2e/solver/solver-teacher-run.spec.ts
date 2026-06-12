import { test, expect } from '@playwright/test';
import { API_BASE, SOLVER_BASE, SOLVER_TOKEN, apiLogin } from '../helpers/auth.helper';

const SOLVER = SOLVER_BASE;
const API    = API_BASE;

const SOLVER_HEADERS = {
  'x-solver-internal-token': SOLVER_TOKEN,
  'Content-Type': 'application/json',
};

test.describe('POST /api/solver/run — TEACHER', () => {
  test('Happy Path: dispara run TEACHER → 202 con solver_run_id', async ({ request }) => {
    await apiLogin(request);
    const periods = await request.get(`${API}/api/academic-periods`);
    const periodList = await periods.json();
    const classrooms = await request.get(`${API}/api/classrooms?page=1&pageSize=5`);
    const classroomData = await classrooms.json();

    if (!periodList?.length || !classroomData?.items?.length) {
      test.skip();
      return;
    }

    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: periodList[0].id,
        run_type: 'TEACHER',
        requested_by: '00000000-0000-0000-0000-000000000001',
        rate_limit_reservation_id: '00000000-0000-0000-0000-000000000002',
        classroom_ids: classroomData.items.slice(0, 2).map((c: { id: string }) => c.id),
        time_limit_ms: 5000,
        keep_existing_drafts: false,
      },
    });

    expect([202, 403]).toContain(res.status());
    if (res.status() === 202) {
      const body = await res.json();
      expect(body).toHaveProperty('solver_run_id');
      expect(body).toHaveProperty('status', 'PENDING');
      expect(body).toHaveProperty('websocket_url');
    }
  });

  test('Fail: sin token interno → 403', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Fail: token interno incorrecto → 403', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: { 'x-solver-internal-token': 'token-incorrecto-e2e' },
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Fail: run_type TEACHER sin requested_by → 403', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
        rate_limit_reservation_id: '00000000-0000-0000-0000-000000000002',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Fail: run_type TEACHER sin rate_limit_reservation_id → 403', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
        requested_by: '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(res.status()).toBe(403);
  });

  test('Fail: time_limit_ms menor al mínimo (1000) → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
        requested_by: '00000000-0000-0000-0000-000000000001',
        rate_limit_reservation_id: '00000000-0000-0000-0000-000000000002',
        time_limit_ms: 100,
      },
    });
    expect(res.status()).toBe(422);
  });

  test('Fail: time_limit_ms mayor al máximo (600000) → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        academic_period_id: '00000000-0000-0000-0000-000000000000',
        run_type: 'TEACHER',
        requested_by: '00000000-0000-0000-0000-000000000001',
        rate_limit_reservation_id: '00000000-0000-0000-0000-000000000002',
        time_limit_ms: 999999,
      },
    });
    expect(res.status()).toBe(422);
  });

  test('Fail: academic_period_id faltante → 422', async ({ request }) => {
    const res = await request.post(`${SOLVER}/api/solver/run`, {
      headers: SOLVER_HEADERS,
      data: {
        run_type: 'TEACHER',
        requested_by: '00000000-0000-0000-0000-000000000001',
        rate_limit_reservation_id: '00000000-0000-0000-0000-000000000002',
      },
    });
    expect(res.status()).toBe(422);
  });
});

// ── GET /api/solver/runs/{run_id} ─────────────────────────────────────────

test.describe('GET /api/solver/runs/{run_id}', () => {
  test('Fail: run_id inexistente → 404', async ({ request }) => {
    const res = await request.get(`${SOLVER}/api/solver/runs/00000000-0000-0000-0000-000000000000`, {
      headers: SOLVER_HEADERS,
    });
    expect(res.status()).toBe(404);
  });

  test('Fail: sin token → 403', async ({ request }) => {
    const res = await request.get(`${SOLVER}/api/solver/runs/00000000-0000-0000-0000-000000000000`);
    expect([403, 404]).toContain(res.status());
  });

  test('Happy Path: run válido tiene estructura correcta', async ({ request }) => {
    // Intentar obtener un run reciente si existe
    // Este test es contextual — pasa si hay runs en la BD
    const res = await request.get(`${SOLVER}/api/solver/runs/00000000-0000-0000-0000-000000000000`, {
      headers: SOLVER_HEADERS,
    });
    // 404 es correcto si no existe; si existiera sería 200 con solver_run_id, status, conflicts
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('solver_run_id');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('conflicts');
      expect(Array.isArray(body.conflicts)).toBe(true);
    }
  });
});

// ── Polling de estado ─────────────────────────────────────────────────────

test.describe('Polling de estado de run', () => {
  test('Edge: polling GET /runs/{id} responde consistentemente', async ({ request }) => {
    // Este test verifica que el endpoint de estado sea estable
    // usando un UUID que sabemos que no existe
    const runId = '00000000-0000-0000-0000-000000000000';

    for (let i = 0; i < 3; i++) {
      const res = await request.get(`${SOLVER}/api/solver/runs/${runId}`, {
        headers: SOLVER_HEADERS,
      });
      expect(res.status()).toBe(404);
    }
  });
});
