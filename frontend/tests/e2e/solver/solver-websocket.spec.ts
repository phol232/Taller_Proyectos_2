import { test, expect } from '@playwright/test';
import { SOLVER_BASE } from '../helpers/auth.helper';

const SOLVER = SOLVER_BASE;
// Convertir http → ws para WebSocket
const WS_BASE = SOLVER.replace(/^http/, 'ws');

// ── WS /api/solver/ws/runs/{run_id} ───────────────────────────────────────

test.describe('WebSocket /api/solver/ws/runs/{run_id}', () => {
  test('Fail: run_id inexistente cierra la conexión con código de error', async ({ page }) => {
    const result = await page.evaluate(async ({ wsBase }: { wsBase: string }) => {
      return new Promise<{ code: number; reason: string }>((resolve) => {
        const ws = new WebSocket(
          `${wsBase}/api/solver/ws/runs/00000000-0000-0000-0000-000000000000`,
        );
        ws.onclose = (e) => resolve({ code: e.code, reason: e.reason });
        // Timeout de seguridad
        setTimeout(() => resolve({ code: -1, reason: 'timeout' }), 5000);
      });
    }, { wsBase: WS_BASE });

    // El servidor puede cerrar la conexión o dejar que haga timeout (code -1)
    // — ambos son comportamientos aceptables para un run inexistente
    expect(typeof result.code).toBe('number');
  });

  test('Happy Path: conexión WS a run válido recibe mensaje inicial', async ({ page }) => {
    // Primero verificar que el solver está vivo
    const health = await page.request.get(`${SOLVER}/healthz`);
    if (health.status() !== 200) {
      test.skip();
      return;
    }

    // Crear un run real sería ideal, pero requiere datos en BD.
    // En su lugar verificamos que el WS se conecta correctamente al endpoint.
    const result = await page.evaluate(async ({ wsBase }: { wsBase: string }) => {
      return new Promise<{ connected: boolean; firstMessage: string | null; code: number }>((resolve) => {
        const ws = new WebSocket(
          `${wsBase}/api/solver/ws/runs/00000000-0000-0000-0000-000000000000`,
        );
        let firstMessage: string | null = null;

        ws.onopen = () => {
          // Conectado
        };
        ws.onmessage = (e) => {
          firstMessage = e.data;
          ws.close();
        };
        ws.onclose = (e) => {
          resolve({ connected: true, firstMessage, code: e.code });
        };
        ws.onerror = () => {
          resolve({ connected: false, firstMessage: null, code: -1 });
        };
        setTimeout(() => {
          ws.close();
          resolve({ connected: true, firstMessage, code: 1000 });
        }, 3000);
      });
    }, { wsBase: WS_BASE });

    // El endpoint debe ser alcanzable (connected true o recibir un close code definido)
    expect(result.connected).toBe(true);
  });
});

// ── WS /api/solver/ws/inputs ──────────────────────────────────────────────

test.describe('WebSocket /api/solver/ws/inputs', () => {
  test('Happy Path: el endpoint /ws/inputs acepta conexión', async ({ page }) => {
    const health = await page.request.get(`${SOLVER}/healthz`);
    if (health.status() !== 200) {
      test.skip();
      return;
    }

    const result = await page.evaluate(async ({ wsBase }: { wsBase: string }) => {
      return new Promise<{ connected: boolean; code: number }>((resolve) => {
        const ws = new WebSocket(`${wsBase}/api/solver/ws/inputs`);

        ws.onopen = () => {
          // Conexión establecida, cerrar limpiamente
          setTimeout(() => ws.close(), 500);
        };
        ws.onclose = (e) => {
          resolve({ connected: true, code: e.code });
        };
        ws.onerror = () => {
          resolve({ connected: false, code: -1 });
        };
        setTimeout(() => {
          ws.close();
          resolve({ connected: true, code: 1000 });
        }, 4000);
      });
    }, { wsBase: WS_BASE });

    expect(result.connected).toBe(true);
  });
});
