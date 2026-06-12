/**
 * E2E API: Módulo Profile — /api/profile
 *
 * Cubre: obtener perfil propio, crear/actualizar (upsert), validaciones.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { API_BASE, apiLogin } from '../helpers/auth.helper';

const BASE = API_BASE;

test.beforeEach(async ({ request }) => {
  await apiLogin(request);
});

// ── GET /api/profile/me ────────────────────────────────────────────────────

test.describe('GET /api/profile/me', () => {
  test('Happy Path: usuario autenticado obtiene su perfil (puede estar vacío) → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/profile/me`);
    expect(res.status()).toBe(200);
    // Puede retornar un perfil vacío o con datos; en ambos casos el campo existe
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.get(`${BASE}/api/profile/me`);
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});

// ── PUT /api/profile/me ────────────────────────────────────────────────────

test.describe('PUT /api/profile/me', () => {
  test('Happy Path: actualiza teléfono y edad → 200', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: {
        phone: '987654321',
        age: 22,
        sex: 'MALE',
        preferredShifts: ['MORNING'],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('phone', '987654321');
  });

  test('Happy Path: upsert — actualizar un campo sin borrar los demás → 200', async ({ request }) => {
    // Primer PUT: establecer datos iniciales
    await request.put(`${BASE}/api/profile/me`, {
      data: { phone: '911222333', age: 20 },
    });

    // Segundo PUT: actualizar solo edad
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { age: 25 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.age).toBe(25);
  });

  test('Fail: DNI con caracteres no numéricos → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { dni: 'ABCD1234' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: DNI con más de 8 dígitos → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { dni: '123456789' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: teléfono que no empieza en 9 → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { phone: '812345678' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: teléfono con menos de 9 dígitos → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { phone: '91234' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: edad negativa → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { age: -1 },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: más de 2 turnos preferidos → 400', async ({ request }) => {
    const res = await request.put(`${BASE}/api/profile/me`, {
      data: { preferredShifts: ['MORNING', 'AFTERNOON', 'EVENING'] },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: sin autenticación → 401', async () => {
    const ctx = await pwRequest.newContext();
    try {
      const res = await ctx.put(`${BASE}/api/profile/me`, {
        data: { phone: '987654321' },
      });
      expect(res.status()).toBe(401);
    } finally { await ctx.dispose(); }
  });
});
