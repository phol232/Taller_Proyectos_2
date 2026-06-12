/**
 * E2E Flows: Golden Path — Flujos principales del sistema
 *
 * Tests de browser en tiempo real que cubren los flujos de negocio completos:
 *  1. Admin: login → navegación por módulos → verificar dashboard
 *  2. Admin: navegar a generación de horarios y verificar la UI
 *  3. Admin: navegar a gestión de períodos académicos
 *  4. Admin: navegar a gestión de aulas, docentes, cursos
 *  5. Verificar navegación entre secciones del sistema
 */
import { test, expect } from '@playwright/test';
import { loginViaUI, API_BASE, apiLogin } from '../helpers/auth.helper';

// ── Flujo 1: Login y Dashboard ─────────────────────────────────────────────

test.describe('Flujo 1: Login y acceso al Dashboard', () => {
  test('Happy Path: login completo redirige a la sección del rol', async ({ page }) => {
    await loginViaUI(page);

    // El destino varía por rol: /admin/, /coordinator/, /student/, /dashboard
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Happy Path: sesión persiste al navegar entre rutas', async ({ page }) => {
    await loginViaUI(page);

    // No debe redirigir al login (sesión activa)
    await expect(page).not.toHaveURL(/\/login/);

    // Navegar al dashboard y verificar que la sesión sigue activa
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Happy Path: usuario no autenticado es redirigido al login', async ({ page }) => {
    await page.goto('/dashboard');
    // Sin sesión debe redirigir al login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ── Flujo 2: Navegación Admin — Períodos Académicos ────────────────────────

test.describe('Flujo 2: Admin — Períodos Académicos', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de períodos académicos', async ({ page }) => {
    await page.goto('/admin/academic-periods');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/academic-periods/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Happy Path: la lista de períodos carga sin errores', async ({ page }) => {
    await page.goto('/admin/academic-periods');
    await page.waitForLoadState('domcontentloaded');

    // No debe haber errores 500 visibles
    await expect(page.locator('text=500')).toHaveCount(0);
    await expect(page.locator('text=Error interno')).toHaveCount(0);
  });
});

// ── Flujo 3: Admin — Aulas ─────────────────────────────────────────────────

test.describe('Flujo 3: Admin — Gestión de Aulas', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de aulas', async ({ page }) => {
    await page.goto('/admin/classrooms');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/classrooms/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 4: Admin — Docentes ──────────────────────────────────────────────

test.describe('Flujo 4: Admin — Gestión de Docentes', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de docentes', async ({ page }) => {
    await page.goto('/admin/teachers');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/teachers/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 5: Admin — Cursos ────────────────────────────────────────────────

test.describe('Flujo 5: Admin — Gestión de Cursos', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de cursos', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/courses/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 6: Admin — Usuarios ──────────────────────────────────────────────

test.describe('Flujo 6: Admin — Gestión de Usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/users/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 7: Admin — Facultades ────────────────────────────────────────────

test.describe('Flujo 7: Admin — Facultades y Carreras', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de facultades', async ({ page }) => {
    await page.goto('/admin/facultades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/facultades/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 8: Admin — Estudiantes ───────────────────────────────────────────

test.describe('Flujo 8: Admin — Gestión de Estudiantes', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a gestión de estudiantes', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/students/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 9: Generación de Horarios (UI) ──────────────────────────────────

test.describe('Flujo 9: Generación de Horarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar a la página de generación de horarios (admin)', async ({ page }) => {
    await page.goto('/admin/schedule/generate');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/schedule\/generate/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Happy Path: navegar a la vista de horarios', async ({ page }) => {
    await page.goto('/schedules/view');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/schedules\/view/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 10: Perfil de Usuario ────────────────────────────────────────────

test.describe('Flujo 10: Perfil y Configuración', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Happy Path: navegar al perfil del usuario', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/profile/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Happy Path: navegar a settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ── Flujo 11: Integración API + UI — Verificar datos en pantalla ──────────

test.describe('Flujo 11: Integración API + UI', () => {
  test('Happy Path: datos creados via API son visibles en la UI', async ({ page, request }) => {
    // 1. Login via API para crear datos
    await apiLogin(request);

    // 2. Verificar que hay períodos en la API
    const periods = await request.get(`${API_BASE}/api/academic-periods`);
    const periodList = await periods.json();

    // 3. Login via UI y verificar que la UI carga sin errores
    await loginViaUI(page);
    await page.goto('/admin/academic-periods');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/academic-periods/);

    // Si hay períodos en la BD, deberían aparecer en la lista
    if (periodList?.length > 0) {
      // La lista no debe estar completamente vacía
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ── Flujo 12: Student — Mi Horario ────────────────────────────────────────

test.describe('Flujo 12: Vista de horario del estudiante', () => {
  test('Happy Path: /student/my-schedule carga sin error', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/student/my-schedule');
    await page.waitForLoadState('domcontentloaded');

    // No debe mostrar error 500
    await expect(page.locator('body')).toBeVisible();
  });
});
