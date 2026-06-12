import { APIRequestContext, Page, expect } from '@playwright/test';

export const CREDS = {
  email:    process.env.TEST_EMAIL    ?? '',
  password: process.env.TEST_PASSWORD ?? '',
};

export const API_BASE     = process.env.API_BASE_URL            ?? 'http://localhost:8080';
export const SOLVER_BASE  = process.env.SOLVER_BASE_URL         ?? 'http://localhost:8090';
export const SOLVER_TOKEN = process.env.SOLVER_INTERNAL_TOKEN   ?? '';

export async function apiLogin(request: APIRequestContext) {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: CREDS,
  });
  expect(res.status(), 'login debería retornar 200').toBe(200);
  return res;
}

export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#email', CREDS.email);
  await page.fill('#password', CREDS.password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 });
}
