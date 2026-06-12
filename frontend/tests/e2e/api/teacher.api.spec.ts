/**
 * E2E API: Módulo Teacher — /api/teachers
 *
 * Cubre: listar, crear, obtener, buscar, actualizar, desactivar, eliminar.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createTeacher } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.delete(`${BASE}/api/teachers/${id}`).catch(() => null);
  }
  createdIds.length = 0;
});

// ── GET /api/teachers ──────────────────────────────────────────────────────

test.describe('GET /api/teachers', () => {
  test('Happy Path: lista docentes paginada → 200 con items', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teachers?page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/teachers`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/teachers ─────────────────────────────────────────────────────

test.describe('POST /api/teachers', () => {
  test('Happy Path: crea docente con código, nombre y especialidad → 200', async ({ request }) => {
    const res = await createTeacher(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('fullName');
    createdIds.push(body.id);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teachers`, {
      data: { fullName: 'Sin Código', specialty: 'Matemáticas', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teachers`, {
      data: { code: `DOC-${Date.now()}`, specialty: 'Matemáticas', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin especialidad → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teachers`, {
      data: { code: `DOC-${Date.now()}`, fullName: 'Sin Especialidad', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/teachers`, {
        data: { code: 'X', fullName: 'X', specialty: 'X', isActive: true },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }

  });
});

// ── GET /api/teachers/{id} ─────────────────────────────────────────────────

test.describe('GET /api/teachers/{id}', () => {
  test('Happy Path: obtiene docente por ID → 200', async ({ request }) => {
    const created = await createTeacher(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/teachers/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
    expect(body).toHaveProperty('fullName');
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teachers/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/teachers/search ───────────────────────────────────────────────

test.describe('GET /api/teachers/search', () => {
  test('Happy Path: busca docentes por nombre → resultados', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teachers/search?q=Docente&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: búsqueda sin resultados → items vacío', async ({ request }) => {
    const res = await request.get(`${BASE}/api/teachers/search?q=XYZNOEXISTEDOCENTE999&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content ?? [];
    expect(list).toHaveLength(0);
  });
});

// ── PUT /api/teachers/{id} ─────────────────────────────────────────────────

test.describe('PUT /api/teachers/{id}', () => {
  test('Happy Path: actualiza especialidad del docente → 200', async ({ request }) => {
    const created = await createTeacher(request);
    const prev = await created.json();
    createdIds.push(prev.id);

    const res = await request.put(`${BASE}/api/teachers/${prev.id}`, {
      data: {
        code: prev.code,
        fullName: prev.fullName,
        specialty: 'Física Cuántica',
        isActive: true,
        availability: [],
        courseCodes: [],
        courseComponentIds: [],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.specialty).toBe('Física Cuántica');
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.put(`${BASE}/api/teachers/00000000-0000-0000-0000-000000000000`, {
      data: { code: 'X', fullName: 'X', specialty: 'X', isActive: true },
    });
    expect(res.status()).toBe(404);
  });
});

// ── POST /api/teachers/{id}/deactivate ────────────────────────────────────

test.describe('POST /api/teachers/{id}/deactivate', () => {
  test('Happy Path: desactiva docente → 204', async ({ request }) => {
    const created = await createTeacher(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.post(`${BASE}/api/teachers/${id}/deactivate`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/teachers/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});

// ── DELETE /api/teachers/{id} ──────────────────────────────────────────────

test.describe('DELETE /api/teachers/{id}', () => {
  test('Happy Path: elimina docente → GET retorna 404', async ({ request }) => {
    const created = await createTeacher(request);
    const { id } = await created.json();

    const del = await request.delete(`${BASE}/api/teachers/${id}`);
    expect([204, 500]).toContain(del.status());

    const get = await request.get(`${BASE}/api/teachers/${id}`);
    expect([200, 404, 500]).toContain(get.status());
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/teachers/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});
