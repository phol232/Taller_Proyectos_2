import './load-env';

import { APIRequestContext, Page, expect } from '@playwright/test';

export type Role = 'student' | 'coordinator' | 'teacher' | 'admin';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta la variable ${name}. Defínela en frontend/.env (consulta frontend/.env.example).`,
    );
  }
  return value;
}

function optionalEnvPair(emailVar: string, passwordVar: string) {
  const email = process.env[emailVar]?.trim();
  const password = process.env[passwordVar]?.trim();
  return email && password ? { email, password } : null;
}

/**
 * Credenciales por rol para los tests E2E que necesitan iniciar sesión como
 * un rol específico (ej. accesibilidad). Cada par es opcional: si no está
 * definido en .env, los tests de ese rol se omiten (test.skip) en vez de fallar.
 */
export const ROLE_CREDENTIALS: Record<Role, { email: string; password: string } | null> = {
  student: optionalEnvPair('E2E_STUDENT_EMAIL', 'E2E_STUDENT_PASSWORD'),
  coordinator: optionalEnvPair('E2E_COORDINATOR_EMAIL', 'E2E_COORDINATOR_PASSWORD'),
  teacher: optionalEnvPair('E2E_TEACHER_EMAIL', 'E2E_TEACHER_PASSWORD'),
  admin: optionalEnvPair('E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'),
};

function resolveApiBase(): string {
  const raw =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8080';
  return raw.replace(/\/api\/?$/, '');
}

// Definido como getters perezosos: solo valida E2E_TEST_EMAIL/PASSWORD cuando
// algo los usa (no al importar el módulo), para no romper specs que no los necesitan.
export const CREDS = {
  get email() {
    return requiredEnv('E2E_TEST_EMAIL');
  },
  get password() {
    return requiredEnv('E2E_TEST_PASSWORD');
  },
};

export const API_BASE = resolveApiBase();
export const SOLVER_BASE = process.env.SOLVER_BASE_URL ?? 'http://localhost:8090';
export const SOLVER_TOKEN = process.env.SOLVER_INTERNAL_TOKEN ?? '';

export async function apiLogin(request: APIRequestContext) {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: CREDS,
  });
  expect(res.status(), 'login debería retornar 200').toBe(200);
  return res;
}

export async function loginViaUI(page: Page) {
  await loginWithCredentials(page, CREDS);
}

export async function loginWithCredentials(
  page: Page,
  creds: { email: string; password: string },
) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 });
}

/**
 * Inicia sesión como un rol específico usando ROLE_CREDENTIALS.
 * Lanza un error claro si las credenciales de ese rol no están configuradas;
 * los callers deben verificar `ROLE_CREDENTIALS[role]` antes para poder
 * hacer test.skip() en vez de fallar.
 */
export async function loginAsRole(page: Page, role: Role) {
  const creds = ROLE_CREDENTIALS[role];
  if (!creds) {
    throw new Error(
      `Faltan credenciales para el rol "${role}". Define E2E_${role.toUpperCase()}_EMAIL y E2E_${role.toUpperCase()}_PASSWORD en frontend/.env.`,
    );
  }
  await loginWithCredentials(page, creds);
}
