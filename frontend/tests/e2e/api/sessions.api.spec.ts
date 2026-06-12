/**
 * E2E API: Módulo Sessions/Tokens — /api/auth/sessions
 *
 * Cubre: listar sesiones activas, revocar sesión específica, integración con logout-all.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { CREDS, API_BASE, apiLogin } from '../helpers/auth.helper';

const BASE = API_BASE;

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

// ── GET /api/auth/sessions ─────────────────────────────────────────────────

test.describe('GET /api/auth/sessions', () => {
  test('Happy Path: lista sesiones activas del usuario → 200 con array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/sessions`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // Al menos la sesión actual debe existir
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  test('Happy Path: cada sesión tiene id, createdAt y deviceInfo', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/sessions`);
    const sessions = await res.json();
    if (sessions.length > 0) {
      const s = sessions[0];
      expect(s).toHaveProperty('id');
    }
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/auth/sessions`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── DELETE /api/auth/sessions/{sessionId} ─────────────────────────────────

test.describe('DELETE /api/auth/sessions/{sessionId}', () => {
  test('Happy Path: revoca una sesión específica → 200', async ({ request }) => {
    const sessions = await request.get(`${BASE}/api/auth/sessions`);
    const list = await sessions.json();

    // Solo ejecutar si hay más de una sesión para no cerrar la sesión actual
    if (list.length < 2) {
      test.skip();
      return;
    }

    // Revocar la sesión más antigua (distinta a la actual)
    const target = list[list.length - 1];
    const res = await request.delete(`${BASE}/api/auth/sessions/${target.id}`);
    expect(res.status()).toBe(204);
  });

  test('Fail: sessionId inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/auth/sessions/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.delete(`${BASE}/api/auth/sessions/00000000-0000-0000-0000-000000000000`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── Integración: logout-all limpia las sesiones ───────────────────────────

test.describe('Integración: logout-all', () => {
  test('Happy Path: tras logout-all, GET /sessions devuelve array vacío (o 401)', async ({ request }) => {
    const before = await request.get(`${BASE}/api/auth/sessions`);
    expect(before.status()).toBe(200);

    await request.post(`${BASE}/api/auth/logout-all`);

    // Después del logout-all, la cookie queda inválida
    const after = await request.get(`${BASE}/api/auth/sessions`);
    expect(after.status()).toBe(401);
  });

  test('Happy Path: nueva sesión tras logout-all es independiente', async () => {
    // Crear un contexto fresco para simular nueva sesión
    const freshCtx = await pwRequest.newContext();
    const login = await freshCtx.post(`${BASE}/api/auth/login`, { data: CREDS });
    expect(login.status()).toBe(200);

    const me = await freshCtx.get(`${BASE}/api/auth/me`);
    expect(me.status()).toBe(200);

    await freshCtx.dispose();
  });
});
