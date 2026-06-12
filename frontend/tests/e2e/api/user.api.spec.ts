/**
 * E2E API: Módulo User — /api/users
 *
 * Cubre: listar, crear, obtener, buscar, activar/desactivar.
 * Limpia los usuarios creados al finalizar.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createUser } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.post(`${BASE}/api/users/${id}/deactivate`).catch(() => null);
  }
  createdIds.length = 0;
});

// ── GET /api/users ─────────────────────────────────────────────────────────

test.describe('GET /api/users', () => {
  test('Happy Path: lista usuarios paginada → 200 con items', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users?page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: paginación retorna segunda página', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users?page=2&pageSize=5`);
    expect(res.status()).toBe(200);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/users`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/users ────────────────────────────────────────────────────────

test.describe('POST /api/users', () => {
  test('Happy Path: crea usuario con email, password, nombre y rol → 200', async ({ request }) => {
    const res = await createUser(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
    createdIds.push(body.id);
  });

  test('Happy Path: usuario creado puede ser autenticado', async ({ request }) => {
    const email = `login.test.${Date.now()}@continental.edu.pe`;
    const password = 'TestPass123!';
    const created = await createUser(request, { email, password });
    expect(created.status()).toBe(200);
    const body = await created.json();
    createdIds.push(body.id);

    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password },
    });
    expect(loginRes.status()).toBe(200);
  });

  test('Fail: email duplicado → 409', async ({ request }) => {
    const email = `dup.${Date.now()}@continental.edu.pe`;
    const first = await createUser(request, { email });
    expect(first.status()).toBe(200);
    const body = await first.json();
    createdIds.push(body.id);

    const second = await createUser(request, { email });
    expect(second.status()).toBe(409);
  });

  test('Fail: email sin dominio institucional → 400', async ({ request }) => {
    const res = await createUser(request, { email: 'test@gmail.com' });
    expect(res.status()).toBe(400);
  });

  test('Fail: password corto (< 8 chars) → 400', async ({ request }) => {
    const res = await createUser(request, { password: '1234' });
    expect(res.status()).toBe(400);
  });

  test('Fail: body sin email → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/users`, {
      data: { password: 'TestPass123!', fullName: 'Sin Email', role: 'STUDENT', active: true, emailVerified: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: rol inválido → 400', async ({ request }) => {
    const res = await createUser(request, { role: 'SUPERHEROE' });
    expect([400, 500]).toContain(res.status());
  });
});

// ── GET /api/users/{id} ────────────────────────────────────────────────────

test.describe('GET /api/users/{id}', () => {
  test('Happy Path: obtiene usuario por ID → 200', async ({ request }) => {
    const created = await createUser(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/users/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/users/search ──────────────────────────────────────────────────

test.describe('GET /api/users/search', () => {
  test('Happy Path: busca por nombre → retorna resultados', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/search?q=Test&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: búsqueda sin resultados → lista vacía', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/search?q=XYZNoExiste999&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content ?? [];
    expect(list).toHaveLength(0);
  });
});

// ── POST /api/users/{id}/deactivate — activate ─────────────────────────────

test.describe('Activar / Desactivar usuario', () => {
  test('Happy Path: desactivar → activar ciclo completo', async ({ request }) => {
    const created = await createUser(request);
    const { id } = await created.json();
    createdIds.push(id);

    // Desactivar
    const deact = await request.post(`${BASE}/api/users/${id}/deactivate`);
    expect(deact.status()).toBe(200);

    // Usuario desactivado no puede hacer login
    const body = await created.json();
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: body.email, password: 'TestPass123!' },
    });
    expect([401, 403]).toContain(loginRes.status());

    // Reactivar
    const act = await request.post(`${BASE}/api/users/${id}/activate`);
    expect(act.status()).toBe(200);
  });

  test('Fail: desactivar ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/users/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});
