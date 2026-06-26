# Informe Final del Proyecto

## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Datos Generales

| Campo | Valor |
|:---|:---|
| **Nombre del proyecto** | Planner UC – Sistema de Generación Óptima de Horarios Académicos |
| **Curso** | Taller de Proyectos 2 – Ingeniería de Sistemas e Informática |
| **Gerente de Proyecto** | Tapia De La Cruz Jhann Pier |
| **Patrocinador académico** | Daniel Gamarra Moreno |
| **Período de ejecución** | 1 de abril – 24 de junio de 2026 |
| **N.° de sprints** | 4 |
| **Fecha del informe** | 25 de junio de 2026 |

#### Equipo del proyecto

| N.° | Apellidos y Nombres | Rol |
|:---|:---|:---|
| 1 | Tapia De La Cruz Jhann Pier | Gerente de Proyecto |
| 2 | Taquiri Rojas Phol Edwin | Desarrollador Backend |
| 3 | Mendez Roca Kevin | Tester (QA) |
| 4 | Condor Aliaga Brayan Pedro | Desarrollador Frontend |

---

### 2. Resumen Ejecutivo

El proyecto **Planner UC** desarrolló y entregó el Producto Mínimo Viable (PMV) de un sistema web (arquitectura SPA + API REST) con un motor de satisfacción de restricciones (CSP) capaz de generar automáticamente horarios académicos válidos, sin solapamientos de docente, aula ni estudiante, respetando prerrequisitos y límites de créditos.

El sistema se construyó sobre una arquitectura desacoplada de tres componentes independientes — **Frontend (Next.js)**, **Backend (Spring Boot)** y **Motor de Optimización / Solver (FastAPI)** — con persistencia en **PostgreSQL** y empaquetado en **Docker**.

Al cierre, se implementaron **17 de los 18 requerimientos funcionales (94.4 %)**. Quedaron pendientes la **exportación de horarios (PDF/Excel, RF-17)** y las **notificaciones por correo electrónico**, ambas catalogadas como mejoras posteriores al PMV. El proyecto se completó el **24 de junio de 2026**, dentro del horizonte académico planificado.

---

### 3. Resumen de Desempeño — Alcance

#### 3.1 Funcionalidades entregadas

| ID | Requerimiento Funcional | Estado |
|:---|:---|:---:|
| RF-01 | Gestionar Estudiantes | ✅ Entregado |
| RF-02 | Gestionar Docentes | ✅ Entregado |
| RF-03 | Gestionar Cursos | ✅ Entregado |
| RF-04 | Gestionar Aulas | ✅ Entregado |
| RF-05 | Validar Condiciones Académicas del Estudiante | ✅ Entregado |
| RF-06 | Gestionar Disponibilidad Docente | ✅ Entregado |
| RF-07 | Generar Asignaciones Horarias de Cursos (Solver CSP) | ✅ Entregado |
| RF-08 | Validar Horario Docente | ✅ Entregado |
| RF-09 | Gestionar Concurrencia en la Asignación de Recursos | ✅ Entregado |
| RF-10 | Construir y Ajustar Horario Docente | ✅ Entregado |
| RF-11 | Confirmar o Cancelar Horario Docente | ✅ Entregado |
| RF-12 | Generar Horario del Estudiante | ✅ Entregado |
| RF-13 | Construir y Ajustar Horario del Estudiante | ✅ Entregado |
| RF-14 | Validar Restricciones del Horario del Estudiante | ✅ Entregado |
| RF-15 | Notificar Conflictos en la Generación o Ajuste (en aplicación) | ✅ Entregado |
| RF-16 | Visualizar Horarios | ✅ Entregado |
| RF-17 | Exportar Horarios (PDF/Excel) | ⏳ **Pendiente** |
| RF-18 | Gestionar Autenticación y Acceso | ✅ Entregado |

#### 3.2 Funcionalidades pendientes

| Funcionalidad | Motivo | Tratamiento |
|:---|:---|:---|
| **Exportación de horarios (RF-17)** | Priorización del núcleo de generación y validación del PMV por encima de funciones de salida. | Trasladada al backlog como mejora posterior al PMV. |
| **Notificaciones por correo electrónico** | Funcionalidad complementaria no crítica para la demostración del PMV; el sistema cubre la notificación de conflictos dentro de la aplicación (RF-15). | Trasladada al backlog como mejora posterior al PMV. |

#### 3.3 Cumplimiento del alcance

| Indicador | Resultado |
|:---|:---:|
| Requerimientos funcionales entregados | **17 / 18 (94.4 %)** |
| Generación de horario docente sin solapamientos (escenario base) | ✅ Cumplido |
| Respeto de prerrequisitos y límites de créditos | ✅ Cumplido |
| Control de acceso por roles (Admin, Coordinador, Docente, Estudiante) | ✅ Cumplido |

---

### 4. Resumen de Desempeño — Calidad

La calidad se aseguró con análisis estático (SonarQube), auditoría de seguridad (OWASP), accesibilidad (WCAG 2.1 AA / axe-core + Lighthouse), usabilidad (SUS) y testing automatizado.

#### 4.1 Métricas consolidadas (SonarQube)

| Dimensión | Frontend | Backend | Solver |
|:---|:---:|:---:|:---:|
| Bugs | 4 | 0 | 2 |
| Vulnerabilities | 0 | 0 | 0 |
| Code Smells | 316 | 77 | 38 |
| Duplicación | 19.2 % | 1.6 % | 0.5 % |
| **Cobertura** | **70.05 %** | **73.1 %** | **78 %** |
| Mantenibilidad | A | A | A |
| Confiabilidad | B | A | C |
| Seguridad | A | A | A |
| Quality Gate | OK | OK | OK |

#### 4.2 Cobertura de pruebas vs. umbral comprometido (≥ 70 %)

| Capa | Cobertura final (líneas) | Umbral | Estado |
|:---|:---:|:---:|:---:|
| Frontend | 70.05 % (2 927 / 4 178) | 70 % | ✅ Cumple |
| Backend | 73.1 % (2 297 / 3 141) | 70 % | ✅ Cumple |
| Solver | 78 % | 70 % | ✅ Cumple |

> La cobertura subió de forma sostenida durante el proyecto (frontend de 7.3 % a 70.05 %; backend de 28.0 % a 73.1 %; solver de ~70 % a 78 %) tras incorporar pruebas unitarias e de integración en las tres capas. Los valores finales se verificaron localmente el **26 de junio de 2026** con los comandos de la sección 4.2.1. El umbral de **≥ 70 % en líneas** quedó cumplido en frontend, backend y solver.

**Suite de pruebas al cierre**

| Capa | Herramienta | Tests ejecutados |
|:---|:---|:---:|
| Frontend | Vitest + v8 coverage | 514 |
| Backend | JUnit 5 + JaCoCo | `./gradlew test` OK |
| Solver | pytest + coverage | 74 |

#### 4.2.1 Comandos para verificar la cobertura localmente

Ejecutar desde la raíz del repositorio. Requisitos previos: Node 20 + pnpm (frontend), JDK 21 (backend), Python 3.11 + dependencias del solver.

**Frontend** — umbral configurado en `frontend/vitest.config.ts` (`lines: 70`):

```bash
cd frontend
pnpm test:coverage
```

El resumen aparece al final de la salida (`Coverage summary`). Reportes HTML/LCOV en `frontend/coverage/`.

**Backend** — JaCoCo se genera automáticamente al finalizar `./gradlew test`:

```bash
cd backend/horarios_api
./gradlew test jacocoTestReport
```

Abrir el reporte HTML en `backend/horarios_api/build/reports/jacoco/test/html/index.html` (métrica **Lines** en la fila *Total*).

**Solver** — `test_integration.py` requiere PostgreSQL; los tests de CI y de cobertura de cierre omiten esa suite:

```bash
cd solver
pip install -r requirements.txt
SOLVER_DB_DSN="postgresql://test:test@localhost:5432/test_db" \
  python3 -m pytest tests/test_components.py tests/test_parallel.py \
    tests/test_student_options.py tests/test_infrastructure_unit.py \
    -q --cov=. --cov-report=term
```

**Las tres capas en CI** — el workflow `.github/workflows/tests.yml` ejecuta los tests de backend, solver y frontend (incluido `pnpm test:coverage`) en cada push/PR a `develop` y `main`.

#### 4.3 Seguridad (OWASP)

- Autenticación **JWT** en cookies `httpOnly`; sin tokens en `localStorage`.
- **CORS** restringido y arquitectura hexagonal que limita la exposición de repositorios.
- Mitigación de vulnerabilidades aplicables del OWASP Top 10 (inyección SQL, XSS, CSRF, exposición de datos).
- Hallazgos críticos de seguridad **resueltos** (ver sección 7).

#### 4.4 Accesibilidad (WCAG 2.1 AA)

- Escaneo automatizado con **axe-core** sobre 35 rutas reales: 34/35 con violaciones iniciales → **29/35 limpias** tras corrección de contraste, etiquetas y nombres accesibles.
- **Lighthouse** confirmó el resultado de forma independiente (promedio 98.4/100 sobre 9 rutas).

#### 4.5 Usabilidad (SUS)

- 5 participantes (Estudiante, Administrador, Docente).
- **Puntaje SUS promedio: 80.0 / 100** (rango 62.5–100), correspondiente a una valoración entre **"Bueno" y "Excelente"**.

---

### 5. Resumen de Desempeño — Cronograma

El proyecto se ejecutó en **4 sprints** con ceremonias ágiles (daily stand-up, revisión y retrospectiva). Se completó el **24 de junio de 2026**, dentro del horizonte académico previsto.

| Sprint | Período (real) | Días hábiles | Foco principal | Estado |
|:---|:---|:---:|:---|:---:|
| Sprint 1 | 1 abr – 1 may 2026 | 23 | Cimientos: autenticación, control de acceso y gestión de entidades (CRUD) | ✅ Completado |
| Sprint 2 | 2 may – 16 may 2026 | 10 | Disponibilidad docente y motor CSP (generación de horario docente) | ✅ Completado |
| Sprint 3 | 17 may – 10 jun 2026 | 18 | Validaciones, concurrencia, ajuste/confirmación de horarios y caché | ✅ Completado |
| Sprint 4 | 11 jun – 24 jun 2026 | 10 | Horario del estudiante (hold de cupo), visualización y aseguramiento de calidad | ✅ Completado |
| **Total** | **1 abr – 24 jun 2026** | **61** | | **✅ Completado** |

> El 15 de abril operó como hito intermedio de planificación dentro del Sprint 1.

**Desempeño del cronograma:** Las 4 iteraciones se cerraron en las fechas planificadas. El proyecto culminó dentro del calendario académico, sin desviaciones que comprometieran la entrega final.

---

### 6. Resumen de Desempeño — Costos

El costo se calcula sobre el esfuerzo real: **4 integrantes con una dedicación efectiva de 2.5 horas por día hábil**. Se aplican las tarifas diferenciadas del presupuesto base: roles de gestión/QA a **USD 5/hora** (Gerente de Proyecto, QA) y roles técnicos de desarrollo a **USD 20/hora** (Backend, Frontend).

#### 6.1 Esfuerzo real por sprint

| Sprint | Días hábiles | Horas por integrante | Horas del equipo (4) | Costo RR.HH. (USD) |
|:---|:---:|:---:|:---:|:---:|
| Sprint 1 | 23 | 57.5 | 230.0 | 2 875 |
| Sprint 2 | 10 | 25.0 | 100.0 | 1 250 |
| Sprint 3 | 18 | 45.0 | 180.0 | 2 250 |
| Sprint 4 | 10 | 25.0 | 100.0 | 1 250 |
| **Total** | **61** | **152.5** | **610.0** | **7 625** |

> Costo por hora del equipo completo = USD 50 (5 + 5 + 20 + 20). Cada integrante acumuló **152.5 horas** a lo largo del proyecto.

#### 6.2 Costo total real (consolidado)

| Fuente | Monto (USD) |
|:---|:---:|
| Recursos humanos (610 h) | 7 625 |
| Infraestructura tecnológica (AWS Lightsail, 3 meses × 36) | 108 |
| Costos indirectos (material, imprevistos y contingencia ≈ 10 %) | 798 |
| **Total real** | **8 531** |

#### 6.3 Planificado vs. real

| Concepto | Planificado (USD) | Real (USD) | Variación |
|:---|:---:|:---:|:---:|
| Recursos humanos | 3 400 | 7 625 | +4 225 |
| Infraestructura | 144 | 108 | −36 |
| Indirectos | 379 | 798 | +419 |
| **Total** | **3 923** | **8 531** | **+4 608** |

> **Análisis de la variación:** El sobrecosto se explica por una **dedicación diaria efectiva mayor a la proyectada**. El presupuesto base asumió ~20 h por rol de gestión/QA y ~50 h por rol técnico (230 h de equipo); el esfuerzo real fue de 610 h de equipo (152.5 h por integrante) debido al trabajo continuo de 2.5 h/día hábil durante los cuatro sprints. La infraestructura se mantuvo dentro de lo previsto.

---

### 7. Resumen de Riesgos e Incidentes

#### 7.1 Estado final del registro de riesgos

| ID | Riesgo | Nivel inicial | ¿Se materializó? | Resultado |
|:---|:---|:---:|:---:|:---|
| R-01 | Complejidad del modelado CSP supera la capacidad del equipo | 20 – Crítico | Parcial | Mitigado: se inició con restricciones hard (H1, H2) y se incorporaron soft de forma incremental. Solver funcional. |
| R-02 | Disponibilidad parcial de los integrantes afecta el cronograma | 20 – Crítico | Parcial | Mitigado: planificación por capacidad real; todos los sprints se cerraron en fecha. |
| R-03 | Solver no disponible al ser invocado por el backend | 20 – Crítico | No | Contrato de invocación definido tempranamente; integración estable. |
| R-04 | El solver supera el límite de 30 s en el escenario base | 12 – Alto | No | Heurística MRV aplicada; tiempos dentro del objetivo. |
| R-05 | Cambios de requisitos generan retrabajo | 12 – Alto | Parcial | Gestionado vía backlog y aprobación del Gerente de Proyecto. |
| R-06 | Dataset de prueba no disponible para validar el solver | 12 – Alto | No | Dataset del escenario base construido conforme a los límites del PMV. |
| R-07 | Inconsistencias frontend–backend por desarrollo en paralelo | 9 – Moderado | No | Contrato REST documentado (Swagger) usado como referencia única. |
| R-08 | Pérdida de trabajo por conflictos en el repositorio | 9 – Moderado | No | Estrategia de ramas `main`/`develop`/`feature/*` con pull requests revisados. |
| R-09 | Reducción de participación de un integrante | 10 – Alto | No | Decisiones técnicas documentadas; sin dependencia de una sola persona. |
| R-10 | Cobertura de pruebas no alcanza el 70 % en módulos críticos | 9 – Moderado | **Sí** | **Mitigado al cierre:** frontend 70.05 %, backend 73.1 %, solver 78 % (ver § 4.2). |

#### 7.2 Incidentes registrados durante la ejecución

| ID | Incidente | Severidad | Estado |
|:---|:---|:---:|:---|
| INC-01 | Contraseña de PostgreSQL hardcodeada en el solver (`config.py`) | BLOCKER | ✅ Resuelto — credencial externalizada (`SOLVER_DB_DSN` obligatoria). |
| INC-02 | Falso positivo de contraseña hardcodeada en traducciones del frontend (`i18n`) | MAJOR | ✅ Resuelto — placeholders ajustados y documentados con `NOSONAR`. |
| INC-03 | Violaciones de accesibilidad WCAG en 34/35 rutas | Alta | ✅ Mitigado — corregidas causas raíz; 29/35 rutas limpias. |
| INC-04 | Fallos en el pipeline de CI (dump backend, env del solver, test flaky en frontend) | Media | ✅ Resuelto — CI estabilizado. |
| INC-05 | Problemas de red en el despliegue (overlay vs. bridge para Dokploy/Swarm) | Media | ✅ Resuelto — se revirtió a configuración estable. |
| INC-06 | Cobertura de pruebas por debajo del umbral del 70 % | Media | ✅ Resuelto — las tres capas superan el 70 % (ver § 4.2). |

---

### 8. Conclusión y Estado de Cierre

El proyecto **Planner UC** entregó un PMV funcional que cumple su objetivo central: **generar horarios académicos válidos y sin solapamientos** mediante un motor CSP, con control de acceso por roles, validaciones académicas y una interfaz usable (SUS 80/100). Se completaron **17 de 18 requerimientos funcionales** dentro del calendario académico.

Quedan como deuda controlada y trasladada al backlog: la **exportación de horarios (RF-17)** y las **notificaciones por correo**.

| Criterio de cierre | Estado |
|:---|:---:|
| Horario docente válido (cero solapamientos) en el escenario base | ✅ |
| Requerimientos funcionales implementados | 17/18 ✅ |
| Sistema demostrable ante el docente evaluador | ✅ |
| Documentación técnica entregada | ✅ |
| Cobertura ≥ 70 % en módulos críticos | ✅ (frontend 70.05 %, backend 73.1 %, solver 78 %) |

---

*Documento elaborado por el equipo Planner UC — Taller de Proyectos 2.*
