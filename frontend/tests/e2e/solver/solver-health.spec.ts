import { test, expect } from '@playwright/test';
import { SOLVER_BASE } from '../helpers/auth.helper';

const BASE = SOLVER_BASE;

test.describe('Solver: Health Check', () => {
  test('Happy Path: GET /healthz → 200 con status ok', async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  test('Happy Path: responde en menos de 2000 ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/healthz`);
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });

  test('Happy Path: Content-Type es application/json', async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('application/json');
  });
});
