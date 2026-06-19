import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROLE_CREDENTIALS, loginAsRole, type Role } from '../helpers/auth.helper';
import { PUBLIC_ROUTES, ROLE_ROUTES } from './routes';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

async function scan(page: Page, route: string) {

  await page.goto(route, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  if (results.violations.length > 0) {
    const report = results.violations
      .map((v) => {
        const targets = v.nodes.slice(0, 5).map((n) => `      ${n.target.join(' ')}`).join('\n');
        return `  [${v.impact ?? 'unknown'}] ${v.id} — ${v.help}\n    ${v.helpUrl}\n${targets}`;
      })
      .join('\n');
    console.log(`\nViolaciones de accesibilidad en ${route}:\n${report}\n`);
  }

  expect(results.violations, `Violaciones de accesibilidad (WCAG 2.0/2.1 A/AA) en ${route}`).toEqual([]);
}

base.describe('Accesibilidad (axe-core) — rutas públicas', () => {
  for (const route of PUBLIC_ROUTES) {
    base(`a11y ${route}`, async ({ page }) => {
      await scan(page, route);
    });
  }
});

const ROLES: Role[] = ['student', 'coordinator', 'teacher', 'admin'];

for (const role of ROLES) {
  base.describe(`Accesibilidad (axe-core) — rol ${role}`, () => {
    base.skip(
      !ROLE_CREDENTIALS[role],
      `Faltan credenciales: define E2E_${role.toUpperCase()}_EMAIL y E2E_${role.toUpperCase()}_PASSWORD en frontend/.env`,
    );

    const roleTest = base.extend<{}, { roleContext: BrowserContext }>({
      roleContext: [
        async ({ browser }, use) => {
          const context = await browser.newContext();
          const setupPage = await context.newPage();
          await loginAsRole(setupPage, role);
          await setupPage.close();
          await use(context);
          await context.close();
        },
        { scope: 'worker' },
      ],
    });

    for (const route of ROLE_ROUTES[role]) {
      roleTest(`a11y ${route}`, async ({ roleContext }) => {
        const page = await roleContext.newPage();
        try {
          await scan(page, route);
        } finally {
          await page.close();
        }
      });
    }
  });
}
