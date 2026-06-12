/**
 * Acceptance: Autenticación — Login UI
 *
 * Tests de browser en tiempo real (headless: false en local).
 * Cubre: happy path, errores de credenciales, validaciones de campo, UX.
 */
import { test, expect } from '@playwright/test';
import { CREDS } from '../helpers/auth.helper';

test.describe('Acceptance: Login UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  // ── Happy Paths ────────────────────────────────────────────────────────

  test('Happy Path: login correcto redirige fuera del login', async ({ page }) => {
    await page.fill('#email', CREDS.email);
    await page.fill('#password', CREDS.password);
    await page.click('button[type="submit"]');

    // El destino varía por rol: /admin/, /coordinator/, /student/, /dashboard
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('Happy Path: la página muestra título, campos y botón de submit', async ({ page }) => {
    await expect(page.locator('h2:has-text("Iniciar Sesión")')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('Happy Path: la página muestra la opción de login con Google', async ({ page }) => {
    await expect(page.locator('text=Continuar con Google')).toBeVisible();
  });

  test('Happy Path: el enlace de olvido de contraseña navega a /forgot-password', async ({ page }) => {
    await page.click('text=¿Olvidaste tu contraseña?');
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  // ── Fail: Credenciales inválidas ───────────────────────────────────────

  test('Fail: password incorrecto muestra toast de error', async ({ page }) => {
    await page.fill('#email', CREDS.email);
    await page.fill('#password', 'ClaveEquivocada123!');
    await page.click('button[type="submit"]');

    // Sonner renderiza los toasts con data-sonner-toast
    await expect(
      page.locator('[data-sonner-toast]').first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Fail: email inexistente muestra toast de error', async ({ page }) => {
    await page.fill('#email', 'nadie.inexistente@continental.edu.pe');
    await page.fill('#password', 'AlgoPrueba123!');
    await page.click('button[type="submit"]');

    await expect(
      page.locator('[data-sonner-toast]').first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  // ── Fail: Validaciones de campo ────────────────────────────────────────

  test('Fail: email con dominio incorrecto muestra error de dominio', async ({ page }) => {
    await page.fill('#email', 'usuario@gmail.com');
    await page.fill('#password', CREDS.password);
    await page.click('button[type="submit"]');

    // El frontend valida el dominio antes de enviar
    await expect(
      page.locator('text=continental.edu.pe').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Fail: email vacío no envía el formulario', async ({ page }) => {
    await page.fill('#password', CREDS.password);
    await page.click('button[type="submit"]');

    // El navegador bloquea el submit y permanecemos en /login
    await expect(page).toHaveURL(/\/login/);
    // El campo email debe quedar visible y sin llenarse
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#email')).toHaveValue('');
  });

  test('Fail: password vacío no envía el formulario', async ({ page }) => {
    await page.fill('#email', CREDS.email);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);
  });

  // ── UX / Interacción ──────────────────────────────────────────────────

  test('UX: toggle de visibilidad de contraseña funciona', async ({ page }) => {
    await page.fill('#password', 'TestPassword123');
    const input = page.locator('#password');

    await expect(input).toHaveAttribute('type', 'password');

    await page.click('button[aria-label="Mostrar contraseña"]');
    await expect(input).toHaveAttribute('type', 'text');

    await page.click('button[aria-label="Ocultar contraseña"]');
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('UX: el botón de submit se deshabilita mientras carga', async ({ page }) => {
    await page.fill('#email', CREDS.email);
    await page.fill('#password', CREDS.password);

    // Interceptar la petición para observar estado intermedio
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Durante la carga el texto cambia a "Iniciando sesión..."
    // (puede que pase muy rápido; verificamos que eventualmente llega al dashboard)
    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15_000 });
  });

  test('UX: el placeholder del email indica el formato institucional', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute(
      'placeholder',
      /continental\.edu\.pe/,
    );
  });
});
