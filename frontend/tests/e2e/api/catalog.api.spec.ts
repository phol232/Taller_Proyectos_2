/**
 * E2E API: Módulo Catalog — /api/catalog (Facultades y Carreras)
 *
 * Cubre: CRUD facultades, CRUD carreras, endpoints públicos vs ADMIN.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';
import { createFacultad, createCarrera } from '../helpers/data.helper';

const BASE = API_BASE;
const createdFacultadIds: string[] = [];

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request);
  for (const id of createdFacultadIds) {
    await request.delete(`${BASE}/api/catalog/facultades/${id}`).catch(() => null);
  }
  createdFacultadIds.length = 0;
});

// ── GET /api/catalog/facultades (público) ──────────────────────────────────

test.describe('GET /api/catalog/facultades', () => {
  test('Happy Path: lista facultades activas (ADMIN) → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/catalog/facultades`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Happy Path: GET /facultades/all (ADMIN) incluye todas → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/catalog/facultades/all`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Fail: /facultades/all sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/catalog/facultades/all`);
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});

// ── POST /api/catalog/facultades ───────────────────────────────────────────

test.describe('POST /api/catalog/facultades', () => {
  test('Happy Path: crea facultad con código y nombre → 200', async ({ request }) => {
    const res = await createFacultad(request);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('code');
    createdFacultadIds.push(body.id);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/catalog/facultades`, {
      data: { code: `FAC${Date.now()}`, isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin código → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/catalog/facultades`, {
      data: { name: 'Sin Código', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: código mayor a 20 chars → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/catalog/facultades`, {
      data: { code: 'A'.repeat(21), name: 'Facultad Larga', isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/catalog/facultades`, {
        data: { code: `FAC${Date.now()}`, name: 'Test', isActive: true },
      });
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});

// ── PUT /api/catalog/facultades/{id} ──────────────────────────────────────

test.describe('PUT /api/catalog/facultades/{id}', () => {
  test('Happy Path: actualiza nombre de facultad → 200', async ({ request }) => {
    const created = await createFacultad(request);
    expect(created.status()).toBe(200);
    const prev = await created.json();
    createdFacultadIds.push(prev.id);

    const newCode = `FU${Date.now().toString(36)}`;
    const res = await request.put(`${BASE}/api/catalog/facultades/${prev.id}`, {
      data: { code: newCode, name: 'Facultad Actualizada', isActive: true },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Facultad Actualizada');
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.put(`${BASE}/api/catalog/facultades/00000000-0000-0000-0000-000000000000`, {
      data: { code: 'X', name: 'X', isActive: true },
    });
    expect(res.status()).toBe(404);
  });
});

// ── POST /api/catalog/facultades/{id}/deactivate ───────────────────────────

test.describe('POST /api/catalog/facultades/{id}/deactivate', () => {
  test('Happy Path: desactiva facultad → 204', async ({ request }) => {
    const created = await createFacultad(request);
    const { id } = await created.json();
    createdFacultadIds.push(id);

    const res = await request.post(`${BASE}/api/catalog/facultades/${id}/deactivate`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/catalog/facultades/00000000-0000-0000-0000-000000000000/deactivate`);
    expect(res.status()).toBe(404);
  });
});

// ── DELETE /api/catalog/facultades/{id} ───────────────────────────────────

test.describe('DELETE /api/catalog/facultades/{id}', () => {
  test('Happy Path: elimina facultad → 204', async ({ request }) => {
    const created = await createFacultad(request);
    const { id } = await created.json();

    const res = await request.delete(`${BASE}/api/catalog/facultades/${id}`);
    expect(res.status()).toBe(204);
  });

  test('Fail: ID inexistente → 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/catalog/facultades/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });
});

// ── GET /api/catalog/carreras ──────────────────────────────────────────────

test.describe('GET /api/catalog/carreras', () => {
  test('Happy Path: lista carreras (ADMIN) → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/catalog/carreras`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Happy Path: filtra carreras por facultadId → lista acotada', async ({ request }) => {
    const fac = await createFacultad(request);
    const { id: facultadId } = await fac.json();
    createdFacultadIds.push(facultadId);

    const res = await request.get(`${BASE}/api/catalog/carreras?facultadId=${facultadId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ── POST /api/catalog/carreras ─────────────────────────────────────────────

test.describe('POST /api/catalog/carreras', () => {
  test('Happy Path: crea carrera asociada a facultad → 200', async ({ request }) => {
    const fac = await createFacultad(request);
    const { id: facultadId } = await fac.json();
    createdFacultadIds.push(facultadId);

    const res = await createCarrera(request, facultadId);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
  });

  test('Fail: facultadId inválido (UUID no existente) → 404', async ({ request }) => {
    const res = await createCarrera(request, '00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('Fail: sin nombre → 400', async ({ request }) => {
    const fac = await createFacultad(request);
    const { id: facultadId } = await fac.json();
    createdFacultadIds.push(facultadId);

    const res = await request.post(`${BASE}/api/catalog/carreras`, {
      data: { facultadId, code: `CAR${Date.now()}`, isActive: true },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.post(`${BASE}/api/catalog/carreras`, {
        data: { facultadId: '00000000-0000-0000-0000-000000000001', name: 'Test', isActive: true },
      });
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});

// ── GET /api/catalog/carreras?facultadId={id} ─────────────────────────────

test.describe('GET /api/catalog/carreras?facultadId', () => {
  test('Happy Path: lista carreras de una facultad → 200 con array', async ({ request }) => {
    const fac = await createFacultad(request);
    const { id: facultadId } = await fac.json();
    createdFacultadIds.push(facultadId);

    const res = await request.get(`${BASE}/api/catalog/carreras?facultadId=${facultadId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Edge: facultad inexistente → 200 con lista vacía o 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/catalog/carreras?facultadId=00000000-0000-0000-0000-000000000000`);
    expect([200, 404]).toContain(res.status());
  });
});
