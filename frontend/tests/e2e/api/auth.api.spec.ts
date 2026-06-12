import { test, expect } from '@playwright/test';
import { CREDS, API_BASE, apiLogin } from '../helpers/auth.helper';

const BASE = API_BASE;

// ── POST /api/auth/login ───────────────────────────────────────────────────

test.describe('POST /api/auth/login', () => {
  test('Happy Path: credenciales válidas → 200 con datos de usuario', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, { data: CREDS });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body.user).toMatchObject({
      email: CREDS.email,
    });
    expect(body.user).toHaveProperty('role');
    expect(body.user).toHaveProperty('id');
  });

  test('Happy Path: respuesta incluye cookies httpOnly de sesión', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, { data: CREDS });

    expect(res.status()).toBe(200);
    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie).toBeTruthy();
  });

  test('Fail: password incorrecto → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: CREDS.email, password: 'ClaveIncorrecta999!' },
    });
    expect(res.status()).toBe(401);
  });

  test('Fail: email inexistente → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'nadie.existe.e2e@continental.edu.pe', password: 'AlgoPrueba123!' },
    });
    expect(res.status()).toBe(401);
  });

  test('Fail: email con dominio externo → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'usuario@gmail.com', password: 'AlgoPrueba123!' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: body vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('Fail: password demasiado corto (< 8 chars) → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: CREDS.email, password: 'abc' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: email con formato inválido → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'no-es-un-email', password: 'AlgoPrueba123!' },
    });
    expect(res.status()).toBe(400);
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────

test.describe('GET /api/auth/me', () => {
  test('Happy Path: usuario autenticado obtiene su perfil', async ({ request }) => {
    await apiLogin(request);

    const res = await request.get(`${BASE}/api/auth/me`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('email', CREDS.email);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('role');
  });

  test('Fail: sin autenticación → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`);
    expect(res.status()).toBe(401);
  });
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────

test.describe('POST /api/auth/refresh', () => {
  test('Happy Path: rota el refresh token → 200 con nuevas cookies', async ({ request }) => {
    await apiLogin(request);

    const res = await request.post(`${BASE}/api/auth/refresh`);
    expect(res.status()).toBe(200);
  });

  test('Fail: sin cookie de refresh → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/refresh`);
    expect(res.status()).toBe(401);
  });
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────

test.describe('POST /api/auth/logout', () => {
  test('Happy Path: logout invalida la sesión actual → /me retorna 401', async ({ request }) => {
    await apiLogin(request);

    const logout = await request.post(`${BASE}/api/auth/logout`);
    expect(logout.status()).toBe(204);

    // La sesión debe quedar inválida
    const me = await request.get(`${BASE}/api/auth/me`);
    expect(me.status()).toBe(401);
  });

  test('Fail: logout sin sesión activa → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/logout`);
    expect(res.status()).toBe(401);
  });
});

// ── POST /api/auth/logout-all ──────────────────────────────────────────────

test.describe('POST /api/auth/logout-all', () => {
  test('Happy Path: cierra todas las sesiones → /me retorna 401', async ({ request }) => {
    await apiLogin(request);

    const res = await request.post(`${BASE}/api/auth/logout-all`);
    expect(res.status()).toBe(204);

    const me = await request.get(`${BASE}/api/auth/me`);
    expect(me.status()).toBe(401);
  });

  test('Fail: sin sesión activa → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/logout-all`);
    expect(res.status()).toBe(401);
  });
});
