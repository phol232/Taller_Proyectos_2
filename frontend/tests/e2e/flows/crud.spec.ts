/**
 * E2E Flows: CRUD interactivo en la UI
 *
 * Prueba el ciclo completo crear → editar → eliminar desde el navegador.
 * Usa el módulo de Aulas (Classrooms) como módulo representativo ya que
 * no tiene dependencias externas (sin FK requeridas para crear un registro).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginViaUI } from '../helpers/auth.helper';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

/** Crea un aula vía UI y devuelve la tarjeta encontrada en la lista (busca por código). */
async function createAulaViaUI(page: Page, code: string, name: string, capacity: string, type: string) {
  await page.getByRole('button', { name: 'Nueva aula' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox').nth(0).fill(code);
  await dialog.getByRole('textbox').nth(1).fill(name);
  await dialog.getByRole('spinbutton').fill(capacity);
  await dialog.getByRole('textbox').nth(2).fill(type);

  await page.getByRole('button', { name: 'Crear aula' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  // Buscar por código para que aparezca sin importar la página
  await page.getByPlaceholder('Buscar por código o nombre…').fill(code);
  await page.waitForTimeout(600); // esperar debounce + respuesta API

  const card = page.locator('.rounded-xl').filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 8_000 });
  return card;
}

// ── Flujo CRUD: Aulas ────────────────────────────────────────────────────────

test.describe('CRUD UI: Gestión de Aulas', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/admin/classrooms');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Happy Path: crear una nueva aula desde la UI', async ({ page }) => {
    const code = `AU-${uid()}`;
    const name = `Aula Test ${code}`;

    const card = await createAulaViaUI(page, code, name, '35', 'AULA');
    await expect(card.locator('text=35 vacantes')).toBeVisible();
  });

  test('Happy Path: editar aula existente (capacidad) desde la UI', async ({ page }) => {
    const code = `AU-${uid()}`;
    const name = `Aula Edit ${code}`;

    const card = await createAulaViaUI(page, code, name, '30', 'AULA');

    // Editar
    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar aula')).toBeVisible();

    await dialog.getByRole('spinbutton').fill('50');
    await page.getByRole('button', { name: 'Guardar aula' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    // Verificar capacidad actualizada en la tarjeta
    await expect(card.locator('text=50 vacantes')).toBeVisible({ timeout: 8_000 });
  });

  test('Happy Path: eliminar aula desde la UI con confirmación', async ({ page }) => {
    const code = `AU-${uid()}`;
    const name = `Aula Del ${code}`;

    const card = await createAulaViaUI(page, code, name, '25', 'AULA');

    // Eliminar
    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByRole('alertdialog').getByText('Eliminar aula')).toBeVisible();

    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();

    // La tarjeta desaparece
    await expect(card).not.toBeVisible({ timeout: 8_000 });
  });

  test('Flujo completo: crear → editar → eliminar', async ({ page }) => {
    const code = `AU-${uid()}`;
    const name = `Aula Full ${code}`;

    // ── CREAR ──
    const card = await createAulaViaUI(page, code, name, '40', 'LAB');

    // ── EDITAR ──
    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar aula')).toBeVisible();
    await dialog.getByRole('spinbutton').fill('60');
    await page.getByRole('button', { name: 'Guardar aula' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
    await expect(card.locator('text=60 vacantes')).toBeVisible({ timeout: 8_000 });

    // ── ELIMINAR ──
    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(card).not.toBeVisible({ timeout: 8_000 });
  });
});
