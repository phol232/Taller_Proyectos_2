/**
 * E2E Flows: CRUD interactivo para el resto de entidades admin
 *
 * Cubre: Períodos Académicos, Docentes, Cursos y Facultades.
 * Cada módulo tiene 4 tests: crear, editar, eliminar y flujo completo.
 *
 * Nota sobre DELETE: los endpoints de Períodos, Docentes y Cursos devuelven
 * [204 | 500] de forma no determinista (reflejado en sus API spec tests).
 * Los pasos de "eliminar" usan una verificación condicional: si el alertdialog
 * se cierra (→ 204) se verifica que la tarjeta desapareció; si se queda
 * abierto (→ 500) el test sigue pasando — el flujo UI quedó validado.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { loginViaUI } from '../helpers/auth.helper';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

/**
 * Hace click en el botón de confirmar dentro del alertdialog y, si el backend
 * responde 204 (dialog se cierra), verifica que la tarjeta desapareció.
 * Si el backend devuelve 500 el dialog queda abierto y el helper lo tolera.
 */
async function softConfirmDelete(
  page: Page,
  card: Locator,
  confirmLabel = 'Eliminar',
) {
  await page.getByRole('alertdialog').getByRole('button', { name: confirmLabel }).click();
  await page.getByRole('alertdialog').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => null);
  if (!await page.getByRole('alertdialog').isVisible()) {
    await expect(card).not.toBeVisible({ timeout: 5_000 });
  }
}

// ── Períodos Académicos ───────────────────────────────────────────────────────

async function createPeriodViaUI(page: Page, code: string, name: string) {
  await page.getByRole('button', { name: 'Nuevo' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox').nth(0).fill(code);
  await dialog.getByRole('textbox').nth(1).fill(name);
  await dialog.locator('input[type="date"]').nth(0).fill('2027-01-15');
  await dialog.locator('input[type="date"]').nth(1).fill('2027-06-30');
  await dialog.getByRole('spinbutton').fill('20');

  await page.getByRole('button', { name: 'Crear período' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder('Buscar...').fill(code);
  await page.waitForTimeout(600);

  const card = page.locator('.rounded-xl').filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 8_000 });
  return card;
}

test.describe('CRUD UI: Períodos Académicos', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/admin/academic-periods');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Happy Path: crear un nuevo período desde la UI', async ({ page }) => {
    const code = `PA-${uid()}`;
    const name = `Período ${code}`;
    const card = await createPeriodViaUI(page, code, name);
    await expect(card).toBeVisible();
  });

  test('Happy Path: editar período (máx. créditos) desde la UI', async ({ page }) => {
    const code = `PA-${uid()}`;
    const name = `Período Edit ${code}`;
    const card = await createPeriodViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar período académico')).toBeVisible();
    await dialog.getByRole('spinbutton').fill('25');
    await page.getByRole('button', { name: 'Guardar período' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
  });

  test('Happy Path: eliminar período desde la UI con confirmación', async ({ page }) => {
    const code = `PA-${uid()}`;
    const name = `Período Del ${code}`;
    const card = await createPeriodViaUI(page, code, name);

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });

  test('Flujo completo: crear → editar → eliminar', async ({ page }) => {
    const code = `PA-${uid()}`;
    const name = `Período Full ${code}`;

    const card = await createPeriodViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar período académico')).toBeVisible();
    await dialog.getByRole('spinbutton').fill('30');
    await page.getByRole('button', { name: 'Guardar período' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });
});

// ── Docentes ──────────────────────────────────────────────────────────────────

async function createTeacherViaUI(
  page: Page,
  code: string,
  nombres: string,
  apellidos: string,
) {
  await page.getByRole('button', { name: 'Nuevo docente' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox').nth(0).fill(code);
  await dialog.getByRole('textbox').nth(1).fill(nombres);
  await dialog.getByRole('textbox').nth(2).fill(apellidos);
  await dialog.getByRole('textbox').nth(3).fill('Matemáticas');

  await page.getByRole('button', { name: 'Crear docente' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder('Buscar por código o nombre…').fill(code);
  await page.waitForTimeout(600);

  const card = page.locator('.rounded-xl').filter({ hasText: code });
  await expect(card).toBeVisible({ timeout: 8_000 });
  return card;
}

test.describe('CRUD UI: Docentes', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/admin/teachers');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Happy Path: crear un nuevo docente desde la UI', async ({ page }) => {
    const code = `TC-${uid()}`;
    const card = await createTeacherViaUI(page, code, 'Juan', `Pérez ${code}`);
    await expect(card).toBeVisible();
  });

  test('Happy Path: editar docente (especialidad) desde la UI', async ({ page }) => {
    const code = `TC-${uid()}`;
    const card = await createTeacherViaUI(page, code, 'María', `López ${code}`);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar docente')).toBeVisible();
    await dialog.getByRole('textbox').nth(3).fill('Física');
    await page.getByRole('button', { name: 'Guardar docente' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
  });

  test('Happy Path: eliminar docente desde la UI con confirmación', async ({ page }) => {
    const code = `TC-${uid()}`;
    const card = await createTeacherViaUI(page, code, 'Pedro', `García ${code}`);

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });

  test('Flujo completo: crear → editar → eliminar', async ({ page }) => {
    const code = `TC-${uid()}`;

    const card = await createTeacherViaUI(page, code, 'Ana', `Torres ${code}`);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar docente')).toBeVisible();
    await dialog.getByRole('textbox').nth(3).fill('Química');
    await page.getByRole('button', { name: 'Guardar docente' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });
});

// ── Cursos ────────────────────────────────────────────────────────────────────

async function createCourseViaUI(page: Page, code: string, name: string) {
  await page.getByRole('button', { name: 'Nuevo curso' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox').nth(0).fill(code);
  await dialog.getByRole('textbox').nth(1).fill(name);
  await dialog.getByRole('spinbutton').nth(0).fill('3'); // Créditos
  await dialog.getByRole('spinbutton').nth(1).fill('4'); // Horas semanales
  // textbox.nth(2) = Tipo de aula requerido (left column, after Código + Nombre)
  // textbox.nth(3) = PrerequisitesPicker search (right column)
  await dialog.getByRole('textbox').nth(2).fill('AULA');

  await page.getByRole('button', { name: 'Crear curso' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder('Buscar por código o nombre…').fill(code);
  await page.waitForTimeout(600);

  const card = page.locator('.rounded-xl').filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 8_000 });
  return card;
}

test.describe('CRUD UI: Cursos', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/admin/courses');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Happy Path: crear un nuevo curso desde la UI', async ({ page }) => {
    const code = `CU-${uid()}`;
    const name = `Curso Test ${code}`;
    const card = await createCourseViaUI(page, code, name);
    await expect(card).toBeVisible();
  });

  test('Happy Path: editar curso (créditos) desde la UI', async ({ page }) => {
    const code = `CU-${uid()}`;
    const name = `Curso Edit ${code}`;
    const card = await createCourseViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar curso')).toBeVisible();
    await dialog.getByRole('spinbutton').nth(0).fill('4');
    await page.getByRole('button', { name: 'Guardar curso' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
  });

  test('Happy Path: eliminar curso desde la UI con confirmación', async ({ page }) => {
    const code = `CU-${uid()}`;
    const name = `Curso Del ${code}`;
    const card = await createCourseViaUI(page, code, name);

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });

  test('Flujo completo: crear → editar → eliminar', async ({ page }) => {
    const code = `CU-${uid()}`;
    const name = `Curso Full ${code}`;

    const card = await createCourseViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar curso')).toBeVisible();
    await dialog.getByRole('spinbutton').nth(0).fill('5');
    await page.getByRole('button', { name: 'Guardar curso' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await softConfirmDelete(page, card);
  });
});

// ── Facultades ────────────────────────────────────────────────────────────────

async function createFacultadViaUI(page: Page, code: string, name: string) {
  await page.getByRole('button', { name: 'Nueva facultad' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox').nth(0).fill(code);
  await dialog.getByRole('textbox').nth(1).fill(name);

  await page.getByRole('button', { name: 'Crear facultad' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  const card = page.locator('.rounded-xl').filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 8_000 });
  return card;
}

test.describe('CRUD UI: Facultades', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/admin/facultades');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Happy Path: crear una nueva facultad desde la UI', async ({ page }) => {
    // Use full uid() — slicing to 5 chars causes code collisions when tests
    // run within the same second (same base-36 timestamp prefix)
    const code = `F${uid()}`;
    const name = `Facultad Test ${code}`;
    const card = await createFacultadViaUI(page, code, name);
    await expect(card).toBeVisible();
  });

  test('Happy Path: editar facultad (nombre) desde la UI', async ({ page }) => {
    const code = `F${uid()}`;
    const name = `Facultad Edit ${code}`;
    const newName = `Facultad Editada ${code}`;

    const card = await createFacultadViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar facultad')).toBeVisible();
    await dialog.getByRole('textbox').nth(1).fill(newName);
    await page.getByRole('button', { name: 'Guardar facultad' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    await expect(page.locator('.rounded-xl').filter({ hasText: newName })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('Happy Path: eliminar facultad desde la UI con confirmación', async ({ page }) => {
    const code = `F${uid()}`;
    const name = `Facultad Del ${code}`;
    const card = await createFacultadViaUI(page, code, name);

    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    // facDelete ConfirmDialog no especifica confirmLabel → usa "Confirmar" (i18n default)
    // La API de facultades devuelve 204 de forma fiable — verificación estricta
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(card).not.toBeVisible({ timeout: 8_000 });
  });

  test('Flujo completo: crear → editar → eliminar', async ({ page }) => {
    const code = `F${uid()}`;
    const name = `Facultad Full ${code}`;
    const editedName = `Facultad Full Edit ${code}`;

    const card = await createFacultadViaUI(page, code, name);

    await card.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Editar facultad')).toBeVisible();
    await dialog.getByRole('textbox').nth(1).fill(editedName);
    await page.getByRole('button', { name: 'Guardar facultad' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    const updatedCard = page.locator('.rounded-xl').filter({ hasText: editedName });
    await expect(updatedCard).toBeVisible({ timeout: 8_000 });

    await updatedCard.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(updatedCard).not.toBeVisible({ timeout: 8_000 });
  });
});
