/**
 * E2E API: Módulo Classroom — /api/classrooms
 *
 * Cubre: listar, crear, obtener, buscar, desactivar, eliminar.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createClassroom } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.delete(`${BASE}/api/classrooms/${id}`).catch(() => null);
  }
  createdIds.length = 0;
});

// ── GET /api/classrooms ────────────────────────────────────────────────────

test.describe('GET /api/classrooms', () => {
  test('Happy Path: lista aulas paginada → 200 con items', async ({ request }) => {
    const res = await request.get(`${BASE}/api/classrooms?page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/classrooms`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/classrooms ───────────────────────────────────────────────────

test.describe('POST /api/classrooms', () => {
  test('Happy Path: crea aula con código, nombre, capacidad y tipo → 200', async ({ request }) => {
    const res = await createClassroom(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    createdIds.push(body.id);
  });

  test('Fail: código duplicado → 409', async ({ request }) => {
    const code = `DUP-AULA-${Date.now()}`;
    const first = await createClassroom(request, { code });
    expect(first.status()).toBe(200);
    const body = await first.json();
    createdIds.push(body.id);

    const second = await createClassroom(request, { code });
    expect(second.status()).toBe(409);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/classrooms`, {
      data: { name: 'Aula Sin Código', capacity: 30, type: 'AULA', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: capacidad menor a 1 → 400', async ({ request }) => {
    const res = await createClassroom(request, { capacity: 0 });
    expect(res.status()).toBe(400);
  });

  test('Fail: tipo vacío → 400', async ({ request }) => {
    const res = await createClassroom(request, { type: '' });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/classrooms`, {
        data: { code: 'X', name: 'X', capacity: 10, type: 'AULA', isActive: true },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── GET /api/classrooms/{id} ───────────────────────────────────────────────

test.describe('GET /api/classrooms/{id}', () => {
  test('Happy Path: obtiene aula por ID → 200', async ({ request }) => {
    const created = await createClassroom(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/classrooms/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/classrooms/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/classrooms/search ────────────────────────────────────────────

test.describe('GET /api/classrooms/search', () => {
  test('Happy Path: busca por nombre → retorna lista', async ({ request }) => {
    const res = await request.get(`${BASE}/api/classrooms/search?q=Test&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: búsqueda sin resultados → items vacío', async ({ request }) => {
    const res = await request.get(`${BASE}/api/classrooms/search?q=XYZNOEXISTEAULA999&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content ?? [];
    expect(list).toHaveLength(0);
  });
});

// ── PUT /api/classrooms/{id} ───────────────────────────────────────────────

test.describe('PUT /api/classrooms/{id}', () => {
  test('Happy Path: actualiza capacidad del aula → 200', async ({ request }) => {
    const created = await createClassroom(request);
    const prev = await created.json();
    createdIds.push(prev.id);

    const res = await request.put(`${BASE}/api/classrooms/${prev.id}`, {
      data: {
        code: prev.code,
        name: prev.name,
        capacity: 50,
        type: prev.type,
        isActive: true,
        availability: [],
        courseCodes: [],
        courseComponentIds: [],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.capacity).toBe(50);
  });
});

// ── POST /api/classrooms/{id}/deactivate ──────────────────────────────────

test.describe('POST /api/classrooms/{id}/deactivate', () => {
  test('Happy Path: desactiva aula → 200', async ({ request }) => {
    const created = await createClassroom(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.post(`${BASE}/api/classrooms/${id}/deactivate`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/classrooms/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});

// ── DELETE /api/classrooms/{id} ────────────────────────────────────────────

test.describe('DELETE /api/classrooms/{id}', () => {
  test('Happy Path: elimina aula → GET retorna 404', async ({ request }) => {
    const created = await createClassroom(request);
    const { id } = await created.json();

    const del = await request.delete(`${BASE}/api/classrooms/${id}`);
    expect(del.status()).toBe(204);

    const get = await request.get(`${BASE}/api/classrooms/${id}`);
    expect(get.status()).toBe(404);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/classrooms/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});
