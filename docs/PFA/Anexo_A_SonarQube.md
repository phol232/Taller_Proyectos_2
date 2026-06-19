# Anexo A - Evaluación de Calidad de Código con SonarQube

## A.1 Configuración del entorno

### Infraestructura
- **Herramienta:** SonarQube Community Build 26.6.0.123539
- **Despliegue:** Docker Compose (`docker-compose.yml`)
- **Base de datos:** PostgreSQL 16 (`planner-sonarqube-db`)
- **Scanner:** `sonarsource/sonar-scanner-cli:latest`
- **URL local:** http://localhost:9000

### Proyectos configurados

| Proyecto | Clave | Tecnología | Archivo de configuración |
|---|---|---|---|
| Frontend | `planner-uc-frontend` | Next.js 16 + TypeScript | `frontend/sonar-project.properties` |
| Backend | `planner-uc-backend` | Java 21 + Spring Boot 4 | `backend/horarios_api/sonar-project.properties` |
| Solver | `planner-uc-solver` | Python 3.13 + FastAPI | `solver/sonar-project.properties` |

### Automatización
El análisis se ejecuta mediante `./scripts/sonar-scan-all.sh`, el cual:
1. Levanta SonarQube y su base de datos.
2. Genera cobertura de pruebas por capa (Vitest, JaCoCo, pytest-cov).
3. Ejecuta los scanners de SonarQube.
4. Publica los resultados en los dashboards respectivos.

### Tokens y autenticación
- El token `SONAR_TOKEN` se encuentra en `.env` y se carga automáticamente en el script.
- El acceso a SonarQube utiliza autenticación por token en los scanners.

## A.2 Métricas consolidadas

*Post incorporación de pruebas de integración frontend y backend. Fuente: API de SonarQube (`/api/measures/component`).*

| Métrica | Frontend | Backend | Solver |
|---|---|---|---|
| **Bugs** | 4 (-6) | 0 | 2 |
| **Vulnerabilities** | 0 (-1) | 0 | 0 (-1) |
| **Code Smells** | 316 | 77 | 38 |
| **Security Hotspots** | 2 | 1 | 2 |
| **Duplicated Lines (%)** | 19.2 | 1.6 | 0.5 |
| **Coverage (%)** | 45.6 (+38.3) | 61.7 (+33.7) | 69.8 |
| **Technical Debt (min)** | 1 611 | 2 843 | 690 |
| **Maintainability Rating** | A (1.0) | A (1.0) | A (1.0) |
| **Reliability Rating** | B (2.0) | A (1.0) | C (3.0) |
| **Security Rating** | A (1.0) | A (1.0) | A (1.0) |
| **Alert Status** | OK | OK | OK |
| **NLOC** | 20 356 | 9 823 | 4 563 |
| **Lines** | 21 967 | 11 967 | 5 478 |

> **Nota sobre correcciones de etiquetado:** el Reliability Rating de frontend (valor numérico 2.0) corresponde a la letra **B**, no C, según la escala estándar de SonarQube (1=A, 2=B, 3=C, 4=D, 5=E). Se corrige aquí y en las secciones siguientes. El Security Rating de frontend ya alcanza **A (1.0)**, confirmando en este nuevo análisis la mitigación descrita en A.4/A.6.3 (antes el dashboard aún no reflejaba el re-análisis).

## A.3 Distribución de issues por severidad

| Severidad | Frontend | Backend | Solver |
|---|---|---|---|
| BLOCKER | 0 | 0 | 0 (-1) |
| CRITICAL | 14 (-6) | 11 | 23 |
| MAJOR | 122 (-1) | 7 (+1) | 11 |
| MINOR | 180 | 31 (+8) | 6 |
| INFO | 4 | 48 (+11) | 0 |

## A.4 Vulnerabilidades detectadas y mitigadas

### Frontend
- ~~**[MAJOR]** `lib/i18n/es.ts:94` - Review this potentially hard-coded password.~~
  - **Estado:** Mitigado.
  - **Riesgo original:** Falso positivo por etiqueta/placeholder de UI del campo contraseña.
  - **Mitigación:** Se ajustaron los textos del placeholder y se agregó `// NOSONAR` con justificación en `frontend/lib/i18n/es.ts` y `frontend/lib/i18n/en.ts`.

### Backend
- No se detectaron vulnerabilidades.

### Solver
- ~~**[BLOCKER]** `app/core/config.py:16` - Make sure this PostgreSQL password gets changed and removed from the code.~~
  - **Estado:** Mitigado.
  - **Riesgo original:** Credencial de base de datos hardcodeada en el default de `db_dsn`.
  - **Mitigación:** Se eliminó el default con credenciales, se hizo obligatoria la variable de entorno `SOLVER_DB_DSN` y se actualizaron `solver/README.md` y `solver/.env.example` con placeholders.

## A.5 Interpretación técnica por capa

### Frontend
- **Puntos fuertes:** Mantenibilidad A; Security Rating A confirmado en el nuevo análisis; cobertura subió de 7.3% a 45.6% tras agregar 172 pruebas de integración (Vitest pasó de 243 a 415 tests).
- **Puntos críticos:**
  - Cobertura de pruebas 45.6%: mejoró considerablemente pero sigue por debajo del umbral recomendado (≥70%).
  - Reliability Rating B con 4 bugs restantes, todos de severidad MINOR: "Visible, non-interactive elements with click handlers must have a role" en `app/(app)/admin/schedule/generate/page.tsx` y `app/(app)/coordinator/schedule/generate/page.tsx` (accesibilidad de teclado).
  - Duplicación 19.2% (sin cambio): sugiere componentes o utilidades repetidas.
- **Recomendación prioritaria:** Seguir aumentando cobertura (especialmente en `app/(app)/**` y componentes de constructor de horarios, aún en 0% en varias páginas); refactorizar duplicados; corregir bugs restantes.

### Backend
- **Puntos fuertes:** Sin bugs ni vulnerabilidades; seguridad y confiabilidad A; baja duplicación; cobertura subió de 28.0% a 61.7% tras agregar 17 clases de prueba (JUnit pasó de 36 a 53 clases, 364 tests).
- **Recomendación:** Seguir incrementando cobertura hacia el umbral del 70%.

### Solver
- **Puntos fuertes:** Cobertura 69.8% (cercana al umbral recomendado); muy baja duplicación; mantenibilidad A; Security Rating A tras externalizar credenciales.
- **Punto de mejora:** Reliability Rating C con 2 bugs restantes.
- **Recomendación:** Corregir los 2 bugs restantes para subir a Reliability Rating B/A.

## A.6 Evidencias de reducción de deuda técnica

Se implementaron correcciones directamente sobre el código fuente del proyecto, verificables mediante la comparación de métricas antes y después.

### A.6.1 Corrección de bugs críticos en frontend

**Problema:** 6 bugs críticos del tipo "Provide a compare function for `Array.prototype.sort()`" en páginas administrativas. El ordenamiento de strings sin `localeCompare` puede comportarse de forma inconsistente entre navegadores.

**Archivos corregidos:**
- `frontend/app/(app)/admin/classrooms/page.tsx`
- `frontend/app/(app)/admin/courses/page.tsx`
- `frontend/app/(app)/admin/schedule/generate/page.tsx`
- `frontend/app/(app)/admin/students/page.tsx`
- `frontend/app/(app)/admin/teachers/page.tsx`
- `frontend/app/(app)/coordinator/schedule/generate/page.tsx`

**Cambio aplicado:**
```typescript
// Antes
Array.from(new Set(items)).sort();

// Después
Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
```

**Impacto medible:**

| Métrica | Antes | Después |
|---|---|---|
| Bugs | 10 | 4 |
| Reliability Rating | D (4.0) | B (2.0) |

### A.6.2 Eliminación de credencial hardcodeada en solver

**Problema:** El DSN de PostgreSQL con usuario y contraseña estaba como valor por defecto en `solver/app/core/config.py`, reportado como vulnerabilidad BLOCKER.

**Cambio aplicado:**
```python
# Antes
db_dsn: str = Field(default="postgresql://horarios:horarios@localhost:5432/horarios_db")

# Después
db_dsn: str = Field(..., description="DSN de PostgreSQL. Ejemplo: postgresql://user:pass@host:port/db")
```

Además se actualizaron:
- `solver/README.md`: el ejemplo de `SOLVER_DB_DSN` ahora usa placeholders `<USER>:<PASSWORD>`.
- `solver/.env.example`: el DSN de ejemplo usa placeholders genéricos.

**Impacto medible:**

| Métrica | Antes | Después |
|---|---|---|
| Vulnerabilities | 1 | 0 |
| Security Rating | E (5.0) | A (1.0) |

### A.6.3 Mitigación de falso positivo de contraseña en frontend

**Problema:** SonarQube detectó como hardcoded password las etiquetas y placeholders de UI del campo de contraseña en `frontend/lib/i18n/es.ts` y `frontend/lib/i18n/en.ts`.

**Cambio aplicado:** Se modificaron los textos para evitar cadenas que simulen credenciales y se agregó la anotación `// NOSONAR` con justificación documentada:

```typescript
passwordLabel: "Contraseña", // NOSONAR - etiqueta de UI, no es credencial
passwordPlaceholder: "Tu clave de acceso", // NOSONAR - placeholder de UI, no es credencial
```

**Impacto medible:**

| Métrica | Antes | Después |
|---|---|---|
| Vulnerabilities | 1 | 0 |
| Security Rating | C (3.0) | A (1.0) |

### A.6.4 Resumen de métricas antes y después

| Proyecto | Métrica | Antes | Después | Δ |
|---|---|---|---|---|
| Frontend | Bugs | 10 | 4 | -6 |
| Frontend | Reliability Rating | D (4.0) | B (2.0) | +2 niveles |
| Frontend | Vulnerabilities | 1 | 0 | -1 |
| Frontend | Security Rating | C (3.0) | A (1.0) | +2 niveles |
| Solver | Vulnerabilities | 1 | 0 | -1 |
| Solver | Security Rating | E (5.0) | A (1.0) | +4 niveles |

### A.6.5 Incremento de cobertura de pruebas automatizadas

**Acción:** se agregaron pruebas de integración con mocks en todas las capas (commits `test(frontend): agregar pruebas de integración con mocks para todos los módulos` y `test: corregir validator PRACTICE+THEORY, agregar pruebas de integración backend y fix e2e`).

**Impacto medible:**

| Proyecto | Métrica | Antes | Después | Δ |
|---|---|---|---|---|
| Frontend | Coverage (SonarQube) | 7.3% | 45.6% | +38.3 pts |
| Frontend | Tests ejecutados (Vitest) | 243 (22 archivos) | 415 (48 archivos) | +172 tests |
| Backend | Coverage (SonarQube) | 28.0% | 61.7% | +33.7 pts |
| Backend | Clases de prueba (JUnit) | 36 | 53 | +17 clases |
| Backend | Tests ejecutados (JUnit) | n/d | 364 (363 OK, 1 skip) | — |
| Solver | Coverage (SonarQube) | 69.8% | 69.8% | Sin cambio |

## A.7 Dashboards y reportes

- Dashboard Frontend: http://localhost:9000/dashboard?id=planner-uc-frontend
- Dashboard Backend: http://localhost:9000/dashboard?id=planner-uc-backend
- Dashboard Solver: http://localhost:9000/dashboard?id=planner-uc-solver

Archivo de métricas descargable: [`metricas_sonarqube.csv`](metricas_sonarqube.csv)

### Evidencias visuales de los dashboards

#### Dashboard Frontend

![Dashboard Frontend - SonarQube](Capturas/DashboardFrontend.png)

*Figura A.1: Dashboard de SonarQube para el proyecto planner-uc-frontend. Se observan las métricas de bugs, vulnerabilidades, code smells, duplicación y cobertura.*

#### Dashboard Backend

![Dashboard Backend - SonarQube](Capturas/DashboardBackend.png)

*Figura A.2: Dashboard de SonarQube para el proyecto planner-uc-backend. Destaca la ausencia de bugs y vulnerabilidades.*

#### Dashboard Solver

![Dashboard Solver - SonarQube](Capturas/DashboardSolver.png)

*Figura A.3: Dashboard de SonarQube para el proyecto planner-uc-solver. Se evidencia la cobertura del 69.8% y el Security Rating A tras externalizar la credencial.*

#### Vista consolidada de métricas (después de incorporar pruebas de integración)

![Métricas consolidadas después - SonarQube](Capturas/Metricas_Despues.png)

*Figura A.4: Vista de proyectos de SonarQube posterior a la incorporación de pruebas de integración en frontend y backend. Se evidencia el salto de cobertura en frontend (45.6%) y backend (61.7%).*

## A.8 Plan de mejoras post-análisis

| # | Mejora | Capa | Prioridad | Estado | Evidencia |
|---|---|---|---|---|---|
| 1 | Externalizar credenciales (config.py) | Solver | Alta | ✅ Completado | `solver/app/core/config.py`, `solver/README.md`, `solver/.env.example` |
| 2 | Revisar hard-coded password en i18n | Frontend | Alta | ✅ Completado | `frontend/lib/i18n/es.ts`, `frontend/lib/i18n/en.ts` |
| 3 | Corregir bugs críticos de `Array.prototype.sort()` | Frontend | Alta | ✅ Completado | 6 archivos en `app/(app)/admin/` y `app/(app)/coordinator/` |
| 4 | Subir cobertura a ≥70% | Frontend | Alta | 🔄 En progreso (7.3% → 45.6%) | `frontend/coverage/lcov.info`, +172 tests |
| 5 | Subir cobertura a ≥70% | Backend | Media | 🔄 En progreso (28.0% → 61.7%) | `jacocoTestReport.xml`, +17 clases JUnit |
| 6 | Reducir duplicación <5% | Frontend | Media | ⏳ Pendiente | Refactorización de componentes |
| 7 | Corregir bugs restantes | Frontend/Solver | Media | ⏳ Pendiente | Cero issues CRITICAL/BLOCKER |
