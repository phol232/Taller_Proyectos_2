/**
 * E2E API: Módulo Password Reset — /api/auth/password-reset
 *
 * Cubre: solicitar OTP, verificar OTP, resetear contraseña.
 *
 */
import { test, expect } from '@playwright/test';
import { CREDS, API_BASE } from '../helpers/auth.helper';

const BASE = API_BASE;

// ── POST /api/auth/password-reset/request ─────────────────────────────────

test.describe('POST /api/auth/password-reset/request', () => {
  test('Happy Path: email institucional registrado → 200 (respuesta genérica)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: CREDS.email },
    });
    expect(res.status()).toBe(200);
  });

  test('Edge: email institucional NO registrado → 200 (no revela existencia)', async ({ request }) => {
    // El backend responde genéricamente para no revelar si el email existe
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: 'nadie.nunca.registrado.e2e@continental.edu.pe' },
    });
    expect(res.status()).toBe(200);
  });

  test('Fail: email con dominio externo → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: 'usuario@gmail.com' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: email vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: body vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('Fail: email con formato inválido → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: 'no-es-email' },
    });
    expect(res.status()).toBe(400);
  });
});

// ── POST /api/auth/password-reset/verify ──────────────────────────────────

test.describe('POST /api/auth/password-reset/verify', () => {
  test('Fail: OTP incorrecto (999999) → 400 o 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, {
      data: { email: CREDS.email, otp: '999999' },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('Fail: OTP con letras (no numérico) → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, {
      data: { email: CREDS.email, otp: 'ABCDEF' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: OTP con menos de 6 dígitos → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, {
      data: { email: CREDS.email, otp: '123' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: OTP con más de 6 dígitos → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, {
      data: { email: CREDS.email, otp: '1234567' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: email vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, {
      data: { email: '', otp: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: body vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/verify`, { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ── POST /api/auth/password-reset/reset ───────────────────────────────────

test.describe('POST /api/auth/password-reset/reset', () => {
  test('Fail: resetToken inválido → 400 o 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/reset`, {
      data: {
        resetToken: 'token-invalido-e2e-prueba',
        newPassword: 'NuevaPass123!',
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('Fail: resetToken vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/reset`, {
      data: { resetToken: '', newPassword: 'NuevaPass123!' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: newPassword corta (< 8 chars) → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/reset`, {
      data: { resetToken: 'cualquier-token', newPassword: 'abc' },
    });
    expect(res.status()).toBe(400);
  });

  test('Fail: body vacío → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/password-reset/reset`, { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ── Integración: el usuario puede hacer login con credenciales actuales ────

test.describe('Integración: credenciales actuales siguen funcionando', () => {
  test('Happy Path: login con credenciales de prueba funciona tras solicitar OTP', async ({ request }) => {
    // Solicitar OTP no bloquea el login actual
    await request.post(`${BASE}/api/auth/password-reset/request`, {
      data: { email: CREDS.email },
    });

    const loginRes = await request.post(`${BASE}/api/auth/login`, { data: CREDS });
    expect(loginRes.status()).toBe(200);
  });
});

// ── UI: Página de forgot-password ─────────────────────────────────────────

test.describe('UI: Página /forgot-password', () => {
  test('Happy Path: la página carga correctamente', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    // Verificar que existe algún campo de email
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test('Fail: enviar con email de dominio externo muestra error', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('usuario@gmail.com');
    await page.keyboard.press('Enter');
    // El frontend valida el dominio
    await expect(page.locator('text=continental.edu.pe').first()).toBeVisible({ timeout: 5_000 });
  });
});
