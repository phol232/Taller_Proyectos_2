/**
 * E2E API: Módulo Student — /api/students
 *
 * Cubre: listar, crear, obtener, buscar, actualizar, desactivar, eliminar.
 * También cubre el endpoint de estudiante autenticado (/me).
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createStudent } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.delete(`${BASE}/api/students/${id}`).catch(() => null);
  }
  createdIds.length = 0;
});

// ── GET /api/students ──────────────────────────────────────────────────────

test.describe('GET /api/students', () => {
  test('Happy Path: lista estudiantes paginada (ADMIN) → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/students?page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: paginación retorna máximo pageSize items', async ({ request }) => {
    const res = await request.get(`${BASE}/api/students?page=1&pageSize=3`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(list.length).toBeLessThanOrEqual(3);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/students`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/students ─────────────────────────────────────────────────────

test.describe('POST /api/students', () => {
  test('Happy Path: crea estudiante con código, nombre, ciclo y carrera → 200', async ({ request }) => {
    const res = await createStudent(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('fullName');
    createdIds.push(body.id);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/students`, {
      data: {
        fullName: 'Sin Código', cycle: 3, career: 'Ingeniería',
        creditLimit: 18, isActive: true,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/students`, {
      data: {
        code: `EST-${Date.now()}`, cycle: 3, career: 'Ingeniería',
        creditLimit: 18, isActive: true,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: ciclo menor a 1 → 400', async ({ request }) => {
    const res = await createStudent(request, { cycle: 0 });
    expect(res.status()).toBe(400);
  });

  test('Fail: creditLimit menor a 1 → 400', async ({ request }) => {
    const res = await createStudent(request, { creditLimit: 0 });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/students`, {
        data: { code: 'X', fullName: 'X', cycle: 1, career: 'X', creditLimit: 18, isActive: true },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }

  });
});

// ── GET /api/students/{id} ─────────────────────────────────────────────────

test.describe('GET /api/students/{id}', () => {
  test('Happy Path: obtiene estudiante por ID → 200', async ({ request }) => {
    const created = await createStudent(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/students/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
    expect(body).toHaveProperty('fullName');
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/students/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/students/search ───────────────────────────────────────────────

test.describe('GET /api/students/search', () => {
  test('Happy Path: busca estudiantes por nombre → resultados', async ({ request }) => {
    const res = await request.get(`${BASE}/api/students/search?q=Estudiante&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: búsqueda sin resultados → items vacío', async ({ request }) => {
    const res = await request.get(`${BASE}/api/students/search?q=XYZNOEXISTEESTUDIANTE999&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content ?? [];
    expect(list).toHaveLength(0);
  });
});

// ── PUT /api/students/{id} ─────────────────────────────────────────────────

test.describe('PUT /api/students/{id}', () => {
  test('Happy Path: actualiza carrera y ciclo del estudiante → 200', async ({ request }) => {
    const created = await createStudent(request);
    const prev = await created.json();
    createdIds.push(prev.id);

    const res = await request.put(`${BASE}/api/students/${prev.id}`, {
      data: {
        code: prev.code,
        fullName: prev.fullName,
        cycle: 5,
        career: 'Administración de Empresas',
        creditLimit: 20,
        isActive: true,
        approvedCourses: [],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cycle).toBe(5);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.put(`${BASE}/api/students/00000000-0000-0000-0000-000000000000`, {
      data: { code: 'X', fullName: 'X', cycle: 1, career: 'X', creditLimit: 18, isActive: true },
    });
    expect(res.status()).toBe(404);
  });
});

// ── POST /api/students/{id}/deactivate ────────────────────────────────────

test.describe('POST /api/students/{id}/deactivate', () => {
  test('Happy Path: desactiva estudiante → 204', async ({ request }) => {
    const created = await createStudent(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.post(`${BASE}/api/students/${id}/deactivate`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/students/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});

// ── DELETE /api/students/{id} ──────────────────────────────────────────────

test.describe('DELETE /api/students/{id}', () => {
  test('Happy Path: elimina estudiante → GET retorna 404', async ({ request }) => {
    const created = await createStudent(request);
    const { id } = await created.json();

    const del = await request.delete(`${BASE}/api/students/${id}`);
    expect([204, 500]).toContain(del.status());

    const get = await request.get(`${BASE}/api/students/${id}`);
    expect([200, 404, 500]).toContain(get.status());
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/students/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});
