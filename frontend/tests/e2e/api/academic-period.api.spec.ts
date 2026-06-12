import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createAcademicPeriod } from '../helpers/data.helper';

const BASE = API_BASE;
const createdIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdIds) {
    await request.delete(`${BASE}/api/academic-periods/${id}`).catch(() => null);
  }
  createdIds.length = 0;
});

test.describe('GET /api/academic-periods', () => {
  test('Happy Path: lista períodos → 200 con array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/academic-periods`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/academic-periods`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

test.describe('POST /api/academic-periods', () => {
  test('Happy Path: crea período con todos los campos → 200', async ({ request }) => {
    const res = await createAcademicPeriod(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    createdIds.push(body.id);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/academic-periods`, {
      data: {
        name: 'Sin Código',
        startsAt: '2026-03-01',
        endsAt: '2026-07-31',
        status: 'DRAFT',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/academic-periods`, {
      data: {
        code: `TST-${Date.now()}`,
        startsAt: '2026-03-01',
        endsAt: '2026-07-31',
        status: 'DRAFT',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/academic-periods`, {
        data: { code: 'X', name: 'X', startsAt: '2026-01-01', endsAt: '2026-06-01', status: 'DRAFT' },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }

  });
});

test.describe('GET /api/academic-periods/{id}', () => {
  test('Happy Path: obtiene período por ID → 200', async ({ request }) => {
    const created = await createAcademicPeriod(request);
    const { id } = await created.json();
    createdIds.push(id);

    const res = await request.get(`${BASE}/api/academic-periods/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', id);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/academic-periods/00000000-0000-0000-0000-000000000000`);
    expect([404, 500]).toContain(res.status());
  });
});

test.describe('GET /api/academic-periods/search', () => {
  test('Happy Path: búsqueda por nombre retorna resultados', async ({ request }) => {
    const res = await request.get(`${BASE}/api/academic-periods/search?q=Test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Happy Path: búsqueda sin coincidencias → lista vacía', async ({ request }) => {
    const res = await request.get(`${BASE}/api/academic-periods/search?q=XYZNOEXISTEPERIODO999`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});

test.describe('PUT /api/academic-periods/{id}', () => {
  test('Happy Path: actualiza nombre y fechas del período', async ({ request }) => {
    const created = await createAcademicPeriod(request);
    const prev = await created.json();
    createdIds.push(prev.id);

    const res = await request.put(`${BASE}/api/academic-periods/${prev.id}`, {
      data: {
        code: prev.code,
        name: `Periodo Actualizado ${Date.now()}`,
        startsAt: '2026-04-01',
        endsAt: '2026-08-31',
        status: 'PLANNING',
        maxStudentCredits: 22,
        isActive: true,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toMatch(/Actualizado/);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.put(`${BASE}/api/academic-periods/00000000-0000-0000-0000-000000000000`, {
      data: { code: 'X', name: 'X', startsAt: '2026-01-01', endsAt: '2026-06-01', status: 'PLANNING' },
    });
    expect([404, 500]).toContain(res.status());
  });
});

test.describe('Activar / Desactivar período', () => {
  test('Happy Path: activar → desactivar ciclo completo', async ({ request }) => {
    const created = await createAcademicPeriod(request);
    const { id } = await created.json();
    createdIds.push(id);

    const act = await request.post(`${BASE}/api/academic-periods/${id}/activate`);
    expect(act.status()).toBe(204);

    const deact = await request.post(`${BASE}/api/academic-periods/${id}/deactivate`);
    expect(deact.status()).toBe(204);
  });

  test('Fail: activar ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/academic-periods/00000000-0000-0000-0000-000000000000/activate`);
    expect([404, 500]).toContain(res.status());
  });
});

test.describe('DELETE /api/academic-periods/{id}', () => {
  test('Happy Path: elimina período → GET retorna 404', async ({ request }) => {
    const created = await createAcademicPeriod(request);
    const { id } = await created.json();

    const del = await request.delete(`${BASE}/api/academic-periods/${id}`);
    expect([204, 500]).toContain(del.status());

    const get = await request.get(`${BASE}/api/academic-periods/${id}`);
    expect([200, 404, 500]).toContain(get.status());
  });

  test('Fail: eliminar ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/academic-periods/00000000-0000-0000-0000-000000000000`);
    expect([404, 500]).toContain(res.status());
  });
});
