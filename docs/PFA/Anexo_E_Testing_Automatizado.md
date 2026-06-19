# Anexo E - Testing y Validación Automatizada

## E.1 Resumen ejecutivo

*Tras incorporar pruebas de integración con mocks en frontend y backend.*

El proyecto cuenta con una estrategia de pruebas automatizadas distribuida en tres capas:

| Capa | Framework | Tipo de pruebas | Ubicación | Estado |
|---|---|---|---|---|
| Frontend | Vitest + Testing Library | Unitarias e integración | `frontend/tests/` | ✅ 415 tests pasando (48 archivos) |
| Frontend | Playwright | E2E (API + UI + Solver) | `frontend/tests/e2e/` | ✅ Ejecutables |
| Backend | JUnit 5 + Mockito + MockMvc | Unitarias e integración | `backend/horarios_api/src/test/java/` | ✅ 53 clases de prueba (364 tests: 363 OK, 1 skip) |
| Solver | pytest | Unitarias | `solver/tests/` | ✅ 67 tests pasando |

## E.2 Pruebas Frontend

### Unitarias e integración (Vitest)

- **Framework:** Vitest + React Testing Library + `user-event`
- **Estructura:**
  - `tests/unit/` — 37 archivos
  - `tests/integration/` — 11 archivos, con mocks ampliados para cubrir todos los módulos
- **Resultado de ejecución:**
  - Test Files: 48 passed
  - Tests: 415 passed
  - Cobertura declarada por Vitest (sobre el set completo `app/**`, `components/**`, `hooks/**`, `lib/**`, `store/**`, `types/**`): 47.18% statements / 37.81% branch / 44.58% funcs / 51.66% lines
- **Cobertura reportada en SonarQube:** 45.6% (consistente con la cifra de Vitest; subió desde 7.3%)

### Principales áreas cubiertas

| Área | Archivos representativos |
|---|---|
| Autenticación y sesión | `sessionExpiredDialog.test.tsx`, `authStore.integration.test.ts`, `api.interceptor.test.ts` |
| Validación de esquemas | `adminSchemas.test.ts`, `formValidation.test.ts` |
| Lógica de horarios | `overlap.test.ts`, `credits.test.ts`, `prerequisites.test.ts` |
| Constructor de horarios | `scheduleBuilderComponents.test.tsx`, `scheduleBuilderApi.test.ts` |
| Stores | `authStore.integration.test.ts`, `scheduleStore.integration.test.ts`, `notificationStore.integration.test.ts` |
| APIs | `adminApi.integration.test.ts`, `scheduleApi.integration.test.ts`, `studentScheduleApi.integration.test.ts` |

### Pruebas E2E (Playwright)

- **Ubicación:** `frontend/tests/e2e/`
- **Estructura:**
  - `api/` — pruebas de API REST
  - `flows/` — flujos de UI con navegador real
  - `solver/` — pruebas del microservicio solver (HTTP + WebSocket)
- **Comando de ejecución:**
  ```bash
  cd frontend
  pnpm test:e2e
  ```

### Cobertura Frontend

```text
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   47.18 |    37.81 |   44.58 |   51.66 |
 hooks             |     100 |    86.95 |     100 |     100 |
 lib               |      94 |    83.52 |   96.29 |   93.75 |
 lib/i18n          |   77.77 |       75 |      80 |    87.5 |
 components/shared |   93.93 |    89.65 |   88.88 |   95.08 |
 components/schedule|   81.66 |    81.39 |   76.66 |   81.48 |
```

> Las utilidades (`hooks`, `lib`, `components/shared`) mantienen cobertura alta (>90% en varios casos). El promedio general (47.18%) baja porque el set de cobertura ahora incluye todo `app/**` (páginas de Next.js), donde varias páginas administrativas y de constructor de horarios todavía están en 0%. Reporte completo: `frontend/coverage/index.html` (HTML) o `frontend/coverage/lcov.info`.

## E.3 Pruebas Backend

### Framework y ubicación

- **Framework:** JUnit 5 + Mockito + Spring MockMvc
- **Ubicación:** `backend/horarios_api/src/test/java/online/horarios_api/`
- **Total de clases de prueba:** 53 (antes 36; +17 tras agregar pruebas de integración)
- **Resultado de ejecución:** 364 tests (363 OK, 1 skip, 0 fallos)
- **Cobertura JaCoCo reportada en SonarQube:** 61.7% (antes 28.0%)

### Áreas cubiertas

| Módulo | Casos representativos |
|---|---|
| Autenticación | Login, OAuth2, refresh, logout, recuperación de contraseña |
| Seguridad | `AuthenticationAdapter`, autorización de endpoints |
| Gestión académica | Períodos, facultades, carreras, cursos, aulas, docentes |
| Horarios | Construcción, generación y validación de horarios |
| Validación | DTOs y esquemas de entrada |

### Ejecución

```bash
cd backend/horarios_api
./gradlew test jacocoTestReport --no-daemon
```

## E.4 Pruebas Solver

### Framework y ubicación

- **Framework:** pytest + pytest-cov
- **Ubicación:** `solver/tests/`
- **Resultado de ejecución:**
  - Tests: 67 passed
  - Cobertura: 70.0% statements
- **Cobertura reportada en SonarQube:** 69.8%

### Áreas cubiertas

| Módulo | Cobertura representativa |
|---|---|
| `app/core/config.py` | 100% |
| `app/domain/models.py` | 95% |
| `app/services/constraint_validator.py` | 89% |
| `app/services/local_search/improver.py` | 93% |
| `app/services/local_search/moves.py` | 84% |
| `app/services/teacher_solver.py` | 91% |
| `app/services/travel_time.py` | 92% |
| `app/services/vacancy_tracker.py` | 100% |

### Ejecución

```bash
cd solver
.venv/bin/python -m pytest tests/test_components.py tests/test_parallel.py -q
```

## E.5 Métricas de cobertura consolidadas

| Capa | Tests ejecutados | Cobertura SonarQube | Umbral recomendado | Brecha |
|---|---|---|---|---|
| Frontend | 415 | 45.6% | ≥70% | -24.4% |
| Backend | 53 clases (364 tests) | 61.7% | ≥70% | -8.3% |
| Solver | 67 | 69.8% | ≥70% | -0.2% |

## E.6 Pipeline de calidad

El script `./scripts/sonar-scan-all.sh` integra:
1. Generación de cobertura para frontend (`pnpm test:coverage`).
2. Generación de cobertura para backend (`./gradlew test jacocoTestReport`).
3. Generación de cobertura para solver (`pytest`).
4. Análisis estático con SonarQube para las tres capas.

## E.7 Hallazgos y plan de mejora

| # | Hallazgo | Impacto | Acción propuesta | Prioridad |
|---|---|---|---|---|
| 1 | Cobertura frontend 45.6% (subió desde 7.3% con +172 tests, aún <70%) | Páginas de `app/(app)/**` y constructor de horarios todavía en 0% | Priorizar tests de páginas administrativas y de constructor de horarios sin cobertura | Alta |
| 2 | Cobertura backend 61.7% (subió desde 28.0%, aún <70%) | Validación del API casi al umbral recomendado | Cerrar la brecha restante (8.3 pts) con pruebas de casos de uso pendientes | Media |
| 3 | Falta tests de accesibilidad automatizados | Riesgo de barreras de accesibilidad (coincide con los 4 bugs MINOR de accesibilidad en frontend) | Integrar `@axe-core/playwright` en tests E2E | Media |
| 4 | Tests E2E requieren entorno completo | Dificultad para CI/CD | Containerizar ejecución con Docker Compose | Baja |

## E.8 Evidencias técnicas

- Reportes de cobertura:
  - `frontend/coverage/lcov.info`
  - `backend/horarios_api/build/reports/jacoco/test/jacocoTestReport.xml`
  - `solver/coverage.xml`
- Documentos de pruebas existentes:
  - [`docs/Pruebas/Pruebas_Frontend.md`](../Pruebas/Pruebas_Frontend.md)
  - [`docs/Pruebas/Pruebas_Backend.md`](../Pruebas/Pruebas_Backend.md)
  - [`docs/Pruebas/Pruebas_E2E.md`](../Pruebas/Pruebas_E2E.md)
  - [`docs/Pruebas/Pruebas_Solver.md`](../Pruebas/Pruebas_Solver.md)
