# Informe Técnico Integral - Aseguramiento de Calidad

**Proyecto:** Planner UC  
**Curso:** Taller de Proyectos 2 - Ingeniería de Sistemas e Informática  
**Responsable:** Equipo de desarrollo Planner UC  

---

## 1. Resumen ejecutivo

Se realizó un proceso integral de aseguramiento de calidad sobre la aplicación Web Full Stack Planner UC, cubriendo análisis estático de código (SonarQube), auditoría de seguridad (OWASP), evaluación de accesibilidad (WCAG), usabilidad (SUS) y testing automatizado.

**Hallazgos críticos resueltos:** se mitigó la contraseña de base de datos hardcodeada en el solver (vulnerabilidad BLOCKER) y se eliminó el falso positivo de contraseña hardcodeada en las traducciones del frontend. **Avance relevante:** tras incorporar pruebas de integración con mocks, la cobertura reportada por SonarQube subió en frontend de 7.3% a 45.6% y en backend de 28.0% a 61.7%; ambas siguen por debajo del umbral profesional recomendado (≥70%).

**Accesibilidad:** se ejecutó un escaneo automatizado con axe-core sobre 35 rutas reales (públicas + 4 roles), encontrando violaciones en 34/35. Se corrigieron 3 causas raíz de contraste de color, 10 `<select>` y 2 switches sin nombre accesible, y 8 campos de `/profile` con `<label>` sin asociar; el reescaneo pasó a 29/35 rutas limpias. Lighthouse confirmó el resultado de forma independiente sobre 9 rutas (promedio 98.4/100) y detectó 2 hallazgos adicionales (WCAG 2.2) pendientes de corrección.

Tras las correcciones, el frontend y el solver alcanzaron Security Rating A, mientras que el backend mantiene seguridad y confiabilidad A.

---

## 2. Métricas consolidadas de calidad

| Dimensión | Frontend | Backend | Solver |
|---|---|---|---|
| **Bugs** | 4 (-6) | 0 | 2 |
| **Vulnerabilities** | 0 (-1) | 0 | 0 (-1) |
| **Code Smells** | 316 | 77 | 38 |
| **Security Hotspots** | 2 | 1 | 2 |
| **Duplicación** | 19.2% | 1.6% | 0.5% |
| **Cobertura** | 45.6% (+38.3 pts) | 61.7% (+33.7 pts) | 69.8% |
| **Deuda técnica** | 1 611 min | 2 843 min | 690 min |
| **Mantenibilidad** | A | A | A |
| **Confiabilidad** | B (mejoró de D) | A | C |
| **Seguridad** | A (mejoró de C) | A | A (mejoró de E) |
| **Estado de Quality Gate** | OK | OK | OK |

---

## 3. Hallazgos críticos

### 3.1 Seguridad

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| SEC-01 | Contraseña PostgreSQL hardcodeada en `solver/app/core/config.py:16` | BLOCKER | ✅ Resuelto |
| SEC-02 | Posible contraseña hardcodeada en `frontend/lib/i18n/es.ts:94` | MAJOR | ✅ Resuelto |

**Impacto original:** exposición de credenciales si el repositorio es público o filtrado.

**Mitigación implementada:**
1. Se eliminó el default con credenciales en `solver/app/core/config.py`; ahora `SOLVER_DB_DSN` es obligatoria.
2. Se actualizó `solver/README.md` y `solver/.env.example` con placeholders.
3. Se ajustaron los placeholders de contraseña en `frontend/lib/i18n/es.ts` y `frontend/lib/i18n/en.ts` y se documentaron con `// NOSONAR`.

### 3.2 Calidad de código

- **Frontend:** 14 issues críticos, 4 bugs (reducción de 6), 316 code smells y 19.2% de duplicación.
- **Backend:** 11 issues críticos, pero 0 bugs y 0 vulnerabilidades; principal área de mejora es cobertura.
- **Solver:** 23 issues críticos, 2 bugs, 0 vulnerabilidades; cobertura y mantenibilidad aceptables.

### 3.3 Cobertura de pruebas

| Capa | Cobertura actual | Umbral recomendado | Brecha |
|---|---|---|---|
| Frontend | 45.6% | ≥70% | -24.4% |
| Backend | 61.7% | ≥70% | -8.3% |
| Solver | 69.8% | ≥70% | -0.2% |

**Nota técnica:** tras agregar pruebas de integración con mocks, el frontend pasó de 243 a 415 tests (48 archivos) y la cobertura medida por Vitest sobre el set completo de código (`app/**`, `components/**`, `hooks/**`, `lib/**`, `store/**`) es 47.18% statements / 51.66% lines, consistente con el 45.6% reportado por SonarQube. El backend pasó de 36 a 53 clases de prueba JUnit (364 tests) y de 28.0% a 61.7% de cobertura. La hipótesis previa de un desajuste por "exclusiones y mapeo de reportes" no se sostiene: la brecha respondía a una cobertura real más baja, ya cerrada en gran parte con las nuevas pruebas.

---

## 4. Análisis por dimensiones del PFA

### 4.1 Seguridad (OWASP)

- ✅ Autenticación JWT en cookies `httpOnly`.
- ✅ Sin tokens en `localStorage`.
- ✅ CORS restringido.
- ✅ Arquitectura hexagonal que limita exposición directa de repositorios.
- ✅ Credenciales del solver externalizadas; placeholder de frontend documentado.

### 4.2 Accesibilidad (WCAG)

*Datos reales del escaneo automatizado axe-core + Playwright (35 rutas, 4 roles) y verificación cruzada con Lighthouse (9 rutas). Detalle completo en [`Anexo_C_WCAG.md`](Anexo_C_WCAG.md).*

- ✅ Uso de componentes accesibles (shadcn/ui + Radix UI).
- ✅ Atributos `alt` — 0 violaciones `image-alt` en las 35 rutas escaneadas.
- ✅ Focus trap en modales.
- ✅ **Corregido:** 10 `<select>` y 2 switches de `/settings` sin nombre accesible (`select-name`/`button-name`, CRITICAL).
- ✅ **Corregido:** 8 campos de `/profile` con `<label>` visible pero sin `htmlFor`/`id` (`label`, CRITICAL).
- 🔄 **Contraste de color:** escaneo inicial con violaciones en 34/35 rutas (3 causas raíz en tokens compartidos); corregido a 29/35 rutas limpias. Queda 1 causa raíz residual (tarjeta `bg-violet-50` con texto `opacity-60`, 4.3:1 vs 4.5:1 requerido) en 6/35 rutas, confirmada también por Lighthouse (promedio 98.4/100 sobre 9 rutas).
- ⏳ Pendiente: landmark `<main>` en rutas `(auth)` y tamaño de objetivos táctiles en `/login` (hallazgos de Lighthouse, criterio WCAG 2.2).
- ⚠️ Navegación por teclado en tablas/grillas: no cubierta por el escaneo automatizado, requiere prueba manual.

### 4.3 Usabilidad (SUS)

- Puntaje ejemplo: **77.5 / 100** (interpretación: Bueno / Aceptable).
- Recomendaciones: simplificar primera visita, agregar tooltips al constructor de horarios.

### 4.4 Testing automatizado

- ✅ 415 tests frontend pasando (48 archivos; antes 243).
- ✅ 53 clases de prueba backend, 364 tests (antes 36 clases).
- ✅ 67 tests solver pasando.
- ✅ 35 tests de accesibilidad (axe-core + Playwright) sobre rutas públicas y de los 4 roles; 29/35 sin violaciones tras corregir los hallazgos críticos (ver 4.2).
- ⚠️ Cobertura SonarQube aún insuficiente en frontend (45.6%) y backend (61.7%), aunque mejoró significativamente.

---

## 5. Plan de mejoras

| # | Mejora | Capa | Prioridad | Estado | Evidencia |
|---|---|---|---|---|---|
| 1 | Externalizar credenciales del solver | Solver | Alta | ✅ Completado | `solver/app/core/config.py`, `solver/README.md`, `solver/.env.example` |
| 2 | Verificar placeholder de password en frontend | Frontend | Alta | ✅ Completado | `frontend/lib/i18n/es.ts`, `frontend/lib/i18n/en.ts` |
| 3 | Corregir bugs críticos de `Array.prototype.sort()` | Frontend | Alta | ✅ Completado | 6 páginas administrativas |
| 4 | Subir cobertura SonarQube a ≥70% | Frontend | Alta | 🔄 En progreso (7.3% → 45.6%) | `coverage/lcov.info`, +172 tests |
| 5 | Subir cobertura JaCoCo a ≥70% | Backend | Media | 🔄 En progreso (28.0% → 61.7%) | Reporte actualizado, +17 clases JUnit |
| 6 | Reducir duplicación frontend <5% | Frontend | Media | ⏳ Pendiente | Refactor de componentes |
| 7 | Corregir bugs restantes | Frontend/Solver | Media | ⏳ Pendiente | Cero issues CRITICAL/BLOCKER |
| 8 | Implementar tests de accesibilidad con Axe | Frontend/QA | Media | ✅ Completado | `frontend/tests/e2e/accessibility/`, `pnpm test:a11y`, 35 rutas × 4 roles |
| 9 | Corregir contraste de color (tokens raíz + insignias) | Frontend | Alta | 🔄 En progreso (34/35 → 29/35 rutas limpias) | `app/globals.css`, 14 archivos; 1 causa raíz residual |
| 10 | Corregir controles sin nombre accesible (`select`/`button`) | Frontend | Alta | ✅ Completado | 10 `<select>` + 2 switches con `aria-label` |
| 11 | Asociar `<label>` con sus campos en `/profile` | Frontend | Alta | ✅ Completado | `FieldLabel` + `id`/`htmlFor`, 8 campos |
| 12 | Ejecutar Lighthouse como verificación cruzada | QA | Media | ✅ Completado | 9 rutas, promedio 98.4/100 (Anexo C, C.3.1) |
| 13 | Agregar landmark `<main>` en rutas `(auth)` y revisar objetivos táctiles en `/login` | Frontend | Baja | ⏳ Pendiente | Detectado por Lighthouse (WCAG 1.3.1 / 2.5.8) |

---

## 6. Evidencias generadas

| Evidencia | Ubicación |
|---|---|
| Métricas SonarQube | [`metricas_sonarqube.csv`](metricas_sonarqube.csv) |
| Análisis SonarQube detallado | [`Anexo_A_SonarQube.md`](Anexo_A_SonarQube.md) |
| Auditoría OWASP | [`Anexo_B_OWASP.md`](Anexo_B_OWASP.md) |
| Evaluación WCAG | [`Anexo_C_WCAG.md`](Anexo_C_WCAG.md) |
| Instrumento SUS y resultados | [`Anexo_D_SUS.md`](Anexo_D_SUS.md), [`sus_resultados.csv`](sus_resultados.csv) |
| Testing automatizado | [`Anexo_E_Testing_Automatizado.md`](Anexo_E_Testing_Automatizado.md) |
| Dashboards SonarQube | http://localhost:9000 |

---

## 7. Conclusiones

El proyecto Planner UC cuenta con una base sólida en seguridad arquitectónica (backend) y lógica de negocio (solver). Durante el PFA se demostró reducción verificable de deuda técnica: se eliminaron las vulnerabilidades de credenciales hardcodeadas y se corrigieron 6 bugs críticos en el frontend, mejorando los ratings de seguridad y confiabilidad.

Se incorporaron pruebas de integración con mocks en frontend (243→415 tests) y backend (36→53 clases), lo que elevó la cobertura reportada por SonarQube de 7.3% a 45.6% en frontend y de 28.0% a 61.7% en backend.

También se implementó y ejecutó la auditoría automatizada de accesibilidad (axe-core + Playwright, 35 rutas × 4 roles): de 34/35 rutas con violaciones se pasó a 29/35 limpias tras corregir contraste de color, controles de formulario sin nombre accesible y `<label>` sin asociar. Lighthouse confirmó el resultado de forma independiente (98.4/100 de promedio) y aportó 2 hallazgos adicionales pendientes.

Las brechas restantes se concentran en alcanzar el umbral de cobertura del 70% (frontend y backend), duplicación de código en frontend, el contraste residual de una causa raíz en tarjetas de horario, y los 2 hallazgos de Lighthouse (landmark `<main>`, objetivos táctiles). Las mejoras propuestas son factibles y están alineadas con los criterios mínimos de calidad exigidos: seguridad, accesibilidad, usabilidad, mantenibilidad, verificabilidad técnica y calidad arquitectónica.
