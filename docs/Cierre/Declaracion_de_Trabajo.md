# Declaración de Trabajo (Statement of Work – SOW)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

Curso: Taller de Proyectos 2 – Ingeniería de Sistemas e Informática
Documento de cierre · Última actualización: 26/06/2026

> En el contexto académico, la Declaración de Trabajo describe formalmente **qué trabajo se acordó
> entregar** y se utiliza al cierre para **verificar que el trabajo está completo** antes de dar por
> finalizado el proyecto.

---

## 1. Antecedentes y Justificación

La planificación manual de horarios académicos en universidades con currículo flexible es un proceso tedioso, propenso a errores y costoso en tiempo, debido a los múltiples conflictos de disponibilidad (docentes, aulas, estudiantes), los prerrequisitos de cursos y los límites de créditos. Planner UC fue desarrollado para automatizar este proceso mediante un motor de satisfacción de restricciones (CSP), garantizando horarios válidos sin solapamientos.

---

## 2. Objetivo del Trabajo

Diseñar, implementar, probar, documentar y desplegar un **Producto Mínimo Viable (PMV)** de un sistema web que genere automáticamente horarios académicos válidos, cumpliendo las restricciones académicas, operativas y temporales definidas, dentro del período del curso Taller de Proyectos 2.

---

## 3. Alcance del Trabajo

### 3.1. Incluido en el alcance (In-Scope)

| Componente | Trabajo acordado |
|:-----------|:-----------------|
| **Gestión de entidades (CRUD)** | Estudiantes, docentes, cursos y aulas, con validaciones de integridad. |
| **Motor de generación CSP** | Microservicio (FastAPI) que genera horarios cumpliendo restricciones *hard* y optimizando *soft*. |
| **Construcción manual de horario** | Con validación en tiempo real de conflictos y prerrequisitos. |
| **Horario del estudiante** | Generación de opciones, borrador, confirmación y *hold* de cupo (`seat_holds`). |
| **Visualización** | Grilla semanal (días vs. franjas) por estudiante, docente y vista general. |
| **Exportación** | Horarios en formato PDF y Excel. |
| **Seguridad** | Autenticación Google OAuth + JWT, hash de contraseñas y control de acceso por roles. |
| **Persistencia y caché** | PostgreSQL como base relacional y Redis como caché de lectura con invalidación por escritura. |
| **Contenedorización y despliegue** | Empaquetado con Docker / Docker Compose. |
| **Calidad** | Pruebas unitarias, de integración (Testcontainers) y E2E (Playwright); análisis SonarQube/OWASP; accesibilidad WCAG (axe-core); evaluación SUS. |
| **Documentación** | Análisis del problema, modelo CSP, arquitectura, especificación de API, pruebas e informes de cierre. |

### 3.2. Fuera del alcance (Out-of-Scope)

* Integración con sistemas institucionales externos (matrícula, ERP académico).
* Aplicación móvil nativa (iOS/Android).
* Operación multi-sede o multi-institución.
* Optimización global garantizada del horario (el PMV garantiza factibilidad, no optimalidad global).
* Migración masiva y carga completa del histórico productivo de la institución. *(El PMV incorporó información académica real —estructura curricular, prerrequisitos y lógica de planificación— que cubrió ~60% del escenario base, complementada con datos representativos; la integración total del histórico institucional queda fuera del alcance.)*

---

## 4. Entregables

| ID | Entregable | Descripción | Estado al cierre |
|:---|:-----------|:------------|:-----------------|
| E-01 | Acta de Constitución | Charter del proyecto y su revisión de cierre. | ✅ Entregado |
| E-02 | Backlog del producto y de sprints | Requerimientos priorizados (`docs/Planificación/`). | ✅ Entregado |
| E-03 | Modelo y diseño del CSP | Variables, dominios y restricciones del solver. | ✅ Entregado |
| E-04 | Arquitectura y contrato de API | Diseño de componentes y especificación REST (`docs/Artefactos/SPEC.md`). | ✅ Entregado |
| E-05 | Software – Backend | API REST en Spring Boot. | ✅ Entregado |
| E-06 | Software – Solver CSP | Microservicio FastAPI de generación de horarios. | ✅ Entregado |
| E-07 | Software – Frontend | SPA en Next.js integrada con la API. | ✅ Entregado |
| E-08 | Base de datos | Esquema PostgreSQL y migraciones (`database/`). | ✅ Entregado |
| E-09 | Suite de pruebas | Unitarias, integración y E2E con reportes de cobertura (`docs/Pruebas/`). | ✅ Entregado |
| E-10 | Informes de calidad (PFA) | SonarQube, OWASP, WCAG, SUS y testing automatizado (`docs/PFA/`). | ✅ Entregado |
| E-11 | Documentación de despliegue | Docker Compose y manual del software (`docs/Cierre/Manual_del_Software.md`). | ✅ Entregado |
| E-12 | Informes de cierre | Informe final, lecciones aprendidas y registros de cierre. | ✅ Entregado |
| E-13 | Demostración / video | Presentación funcional del sistema. | ✅ Entregado |

---

## 5. Cronograma de Trabajo (Hitos)

| Hito | Entregable verificable | Periodo |
|:-----|:-----------------------|:--------|
| H-01 Inicio | Charter + backlog inicial | Marzo 2026 |
| H-02 Análisis | Modelo CSP definido | Abril 2026 |
| H-03 Diseño | Arquitectura + contrato API | Abril 2026 |
| H-04 Gestión (CRUD) | CRUD funcional con pruebas | Abril–Mayo 2026 |
| H-05 Motor CSP | Horario válido ≤ 30 s | Mayo 2026 |
| H-06 Interfaz | SPA integrada | Mayo 2026 |
| H-07 Integración | Sistema end-to-end | Mayo–Junio 2026 |
| H-08 Pruebas | Cobertura ≥ 70%, cero defectos críticos | Junio 2026 |
| H-09 Presentación | Demostración + documentación | Junio 2026 |

---

## 6. Criterios de Aceptación del Trabajo

El trabajo se considera **completo y aceptable** cuando:

1. El sistema genera horarios válidos (cero solapamientos) en ≤ 30 s para el escenario base.
2. Los requerimientos funcionales del PMV están implementados y verificados por prueba de aceptación.
3. La cobertura de pruebas en módulos críticos (CSP, validaciones, autenticación) es ≥ 70%.
4. No existen defectos críticos abiertos.
5. El sistema es demostrable ante el docente evaluador.
6. La documentación técnica y de cierre está completa y disponible en el repositorio.

---

## 7. Recursos y Responsabilidades

| Rol | Responsable | Responsabilidad principal |
|:----|:------------|:--------------------------|
| Gerente de Proyecto | Tapia De La Cruz Jhann Pier | Planificación, coordinación y seguimiento. |
| Desarrollador Backend / CSP | Taquiri Rojas Phol Edwin | API REST, lógica de negocio y motor CSP. |
| Desarrollador Frontend | Brayan Pedro Condor Aliaga | SPA, vistas e integración con la API. |
| QA / Tester | Kevin Mendez Roca | Pruebas unitarias, integración y E2E. |
| Patrocinador Académico | Daniel Gamarra Moreno | Supervisión y aprobación de entregables. |

**Recursos:** equipos de cómputo personales, herramientas de software libre / licencias educativas, repositorio GitHub y servicios de hosting de demo (plan educativo/gratuito). Proyecto de carácter académico, sin presupuesto monetario formal.

---

## 8. Supuestos y Restricciones

Aplican los supuestos (S-01 a S-10) y restricciones (R-01 a R-10) definidos en el Registro de Supuestos y verificados en su revisión de cierre (`docs/Cierre/Registro_de_Supuestos.md`). En particular: alcance limitado al PMV, ejecución dentro del período académico, capacidad computacional estándar y dependencia de la calidad de los datos de entrada.

---

## 9. Verificación de Completitud del Trabajo (Cierre)

| Criterio de aceptación | Verificado | Evidencia |
|:-----------------------|:----------:|:----------|
| Horarios válidos en ≤ 30 s (escenario base) | ✅ | `docs/Artefactos/Auditoria_Solver.md` |
| RF implementados y verificados | ✅ | `docs/Pruebas/` |
| Cobertura ≥ 70% en módulos críticos | ✅ | JaCoCo / pytest-cov / Vitest |
| Cero defectos críticos abiertos | ✅ | `docs/Cierre/Registro_de_Defectos.md` |
| Sistema demostrable | ✅ | Demostración + video |
| Documentación completa | ✅ | Carpeta `docs/` |

**Conclusión:** Todos los entregables comprometidos fueron producidos y todos los criterios de aceptación se cumplieron. El trabajo descrito en esta Declaración de Trabajo se considera **completo**, habilitando el cierre formal del proyecto.

---

## 10. Aprobación

| Rol | Nombre | Firma | Fecha |
|:----|:-------|:------|:------|
| Gerente de Proyecto | Tapia De La Cruz Jhann Pier | _________________ | 26/06/2026 |
| Patrocinador Académico | Daniel Gamarra Moreno | _________________ | 26/06/2026 |
