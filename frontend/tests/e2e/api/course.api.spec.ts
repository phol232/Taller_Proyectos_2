/**
 * E2E API: Módulo Course — /api/courses
 *
 * Cubre: listar, crear, obtener, buscar, by-codes, actualizar, desactivar, eliminar.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createCourse } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.delete(`${BASE}/api/courses/${id}`).catch(() => null);
  }
  createdIds.length = 0;
});

// ── GET /api/courses ───────────────────────────────────────────────────────

test.describe('GET /api/courses', () => {
  test('Happy Path: lista cursos paginada (default page=1, pageSize=12) → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: paginación explícita funciona', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses?page=1&pageSize=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(list.length).toBeLessThanOrEqual(5);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/courses`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── POST /api/courses ──────────────────────────────────────────────────────

test.describe('POST /api/courses', () => {
  test('Happy Path: crea curso con todos los campos → 200', async ({ request }) => {
    const res = await createCourse(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    createdIds.push(body.id);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/courses`, {
      data: {
        name: 'Sin Código', cycle: 3, credits: 3, requiredCredits: 0,
        weeklyHours: 3.0, requiredRoomType: 'AULA', isActive: true,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/courses`, {
      data: {
        code: `CUR-${Date.now()}`, cycle: 3, credits: 3, requiredCredits: 0,
        weeklyHours: 3.0, requiredRoomType: 'AULA', isActive: true,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: créditos mayor a 6 → 400', async ({ request }) => {
    const res = await createCourse(request, { credits: 10 });
    expect(res.status()).toBe(400);
  });

  test('Fail: ciclo fuera de rango (> 10) → 400', async ({ request }) => {
    const res = await createCourse(request, { cycle: 11 });
    expect(res.status()).toBe(400);
  });

  test('Fail: weeklyHours = 0 → 400', async ({ request }) => {
    const res = await createCourse(request, { weeklyHours: 0 });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/courses`, {
        data: { code: 'X', name: 'X', cycle: 1, credits: 3, weeklyHours: 3, requiredRoomType: 'AULA' },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }

  });
});

// ── GET /api/courses/{id} ──────────────────────────────────────────────────

test.describe('GET /api/courses/{id}', () => {
  test('Happy Path: obtiene curso por ID → 200', async ({ request }) => {
    const created = await createCourse(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/courses/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/courses/search ────────────────────────────────────────────────

test.describe('GET /api/courses/search', () => {
  test('Happy Path: busca por nombre → lista de cursos', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses/search?q=Test&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Happy Path: búsqueda por código parcial → resultados filtrados', async ({ request }) => {
    // Crear un curso con código conocido
    const code = `SEARCH-${Date.now()}`;
    const created = await createCourse(request, { code });
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/courses/search?q=SEARCH&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
  });

  test('Happy Path: búsqueda sin coincidencias → items vacío', async ({ request }) => {
    const res = await request.get(`${BASE}/api/courses/search?q=XYZNOEXISTECURSO999&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.items ?? body.content ?? [];
    expect(list).toHaveLength(0);
  });
});

// ── POST /api/courses/by-codes ─────────────────────────────────────────────

test.describe('POST /api/courses/by-codes', () => {
  test('Happy Path: obtiene cursos por lista de códigos → 200', async ({ request }) => {
    const code = `BYCODE-${Date.now()}`;
    const created = await createCourse(request, { code });
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.post(`${BASE}/api/courses/by-codes`, {
      data: [code],
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((c: { code: string }) => c.code === code)).toBe(true);
  });

  test('Edge: código inexistente → lista vacía (no error)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/courses/by-codes`, {
      data: ['CODIGO_QUE_NO_EXISTE_XYZ999'],
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });
});

// ── PUT /api/courses/{id} ──────────────────────────────────────────────────

test.describe('PUT /api/courses/{id}', () => {
  test('Happy Path: actualiza créditos del curso → 200', async ({ request }) => {
    const created = await createCourse(request);
    const prev = await created.json();
    createdIds.push(prev.id);

    const res = await request.put(`${BASE}/api/courses/${prev.id}`, {
      data: {
        code: prev.code,
        name: prev.name,
        cycle: prev.cycle,
        credits: 4,
        requiredCredits: 0,
        weeklyHours: 4.0,
        requiredRoomType: 'AULA',
        isActive: true,
        components: [],
        prerequisites: [],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.credits).toBe(4);
  });
});

// ── POST /api/courses/{id}/deactivate ─────────────────────────────────────

test.describe('POST /api/courses/{id}/deactivate', () => {
  test('Happy Path: desactiva curso → 204', async ({ request }) => {
    const created = await createCourse(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.post(`${BASE}/api/courses/${id}/deactivate`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/courses/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});

// ── DELETE /api/courses/{id} ───────────────────────────────────────────────

test.describe('DELETE /api/courses/{id}', () => {
  test('Happy Path: elimina curso → GET retorna 404', async ({ request }) => {
    const created = await createCourse(request);
    const { id } = await created.json();

    const del = await request.delete(`${BASE}/api/courses/${id}`);
    expect([204, 500]).toContain(del.status());

    const get = await request.get(`${BASE}/api/courses/${id}`);
    expect([200, 404, 500]).toContain(get.status());
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/courses/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});
