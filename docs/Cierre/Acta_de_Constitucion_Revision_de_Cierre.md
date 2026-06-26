# Acta de Constitución del Proyecto – Revisión de Cierre (Project Charter)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

Curso: Taller de Proyectos 2 – Ingeniería de Sistemas e Informática
Documento de cierre · Última actualización: 26/06/2026

> Este documento revisa, al cierre del proyecto, el **Acta de Constitución** original
> (`docs/Sprint_0/Project_Charter.md`) para evaluar si se cumplieron los **requisitos de alto nivel**
> y los **criterios de éxito** comprometidos al inicio. No reemplaza al charter original: lo verifica.

---

## 1. Propósito de la Revisión

De acuerdo con la metodología de cierre, el Acta de Constitución se revisa al final del proyecto para evaluar si los requisitos de alto nivel y los criterios de éxito definidos en la fase de inicio fueron alcanzados. Esta revisión deja constancia formal del estado de cumplimiento y sustenta la decisión de aceptación y cierre del proyecto.

---

## 2. Verificación de Requisitos de Alto Nivel

| ID | Requisito comprometido | Criterio de verificación | Estado | Evidencia al cierre |
|:---|:-----------------------|:-------------------------|:-------|:--------------------|
| RAL-01 | Horarios sin solapamientos de docente, aula ni estudiante. | Cero solapamientos en el escenario base. | ✅ Cumplido | Validación automatizada de solapamientos: 0 conflictos *hard* en el escenario base. |
| RAL-02 | Respeto de prerrequisitos y límites de créditos. | 100% de horarios cumplen reglas académicas. | ✅ Cumplido | Validador del solver rechaza prerrequisitos no satisfechos y excesos de crédito. |
| RAL-03 | Considerar disponibilidad de docentes, estudiantes y aulas. | Sin asignaciones en franjas no disponibles. | ✅ Cumplido | Disponibilidad modelada como dominio del CSP y cacheada en Redis. |
| RAL-04 | Interfaz que permite tareas básicas en ≤ 5 min. | Evaluación con usuario nuevo. | ✅ Cumplido | Cuestionario SUS aplicado (ver `docs/PFA/Anexo_D_SUS.md`); flujos básicos completados dentro del objetivo. |
| RAL-05 | Estándares básicos de seguridad. | Accesos sin auth/fuera de rol → 401/403. | ✅ Cumplido | Pruebas de seguridad y análisis OWASP (`docs/PFA/Anexo_B_OWASP.md`); JWT + control por roles. |
| RAL-06 | Generar horario docente en ≤ 30 s (escenario base). | Medición en entorno de pruebas. | ✅ Cumplido | Optimización con caché Redis y portafolio paralelo de ciclos; tiempo dentro del límite en el escenario base. |

**Resultado:** 6 de 6 requisitos de alto nivel cumplidos.

---

## 3. Verificación de Objetivos y Criterios de Éxito

| Objetivo | Criterio de éxito medible | Estado | Evidencia al cierre |
|:---------|:--------------------------|:-------|:--------------------|
| Sistema que genera horarios válidos sin conflictos. | Cero solapamientos con datos representativos. | ✅ Cumplido | Demostración y pruebas del solver. |
| Implementar correctamente el modelo CSP. | Escenario base resuelto en ≤ 30 s. | ✅ Cumplido | Métricas del solver (`docs/Artefactos/Auditoria_Solver.md`). |
| Cumplir los requerimientos funcionales definidos. | RF verificables por prueba de aceptación. | ✅ Cumplido | Suite de pruebas backend/frontend/E2E (`docs/Pruebas/`). |
| Entregar dentro del tiempo académico. | Entrega antes del cierre del curso. | ✅ Cumplido | Hitos H-01 a H-09 ejecutados en calendario. |
| Arquitectura escalable y mantenible. | Nueva entidad/regla sin reestructuración total. | ✅ Cumplido | Arquitectura desacoplada (SPA + API REST + microservicio CSP). |
| Documentar las decisiones técnicas. | Documentación disponible al cierre. | ✅ Cumplido | `docs/` con arquitectura, modelo CSP, API, pruebas y PFA. |
| Cobertura de pruebas ≥ 70% en módulos críticos. | Reporte de herramienta de testing ≥ 70%. | ✅ Cumplido | JaCoCo (backend), pytest-cov (solver) y Vitest (frontend). |

**Resultado:** 7 de 7 objetivos/criterios de éxito cumplidos.

---

## 4. Verificación de Requisitos de Aprobación del Proyecto

| # | Condición de aprobación | Estado |
|:--|:------------------------|:-------|
| 1 | Horarios válidos (cero solapamientos) en ≤ 30 s para el escenario base. | ✅ |
| 2 | RF implementados y verificados por prueba de aceptación. | ✅ |
| 3 | Sistema demostrable ante el docente evaluador. | ✅ |
| 4 | Documentación técnica completa entregada. | ✅ |
| 5 | Video demostrativo del sistema funcional. | ✅ |
| 6 | Cobertura ≥ 70% en módulos críticos. | ✅ |

---

## 5. Cumplimiento de Hitos

| N° | Hito | Estado |
|:---|:-----|:-------|
| H-01 | Inicio del proyecto (charter + backlog) | ✅ Completado |
| H-02 | Análisis y modelado del problema (CSP) | ✅ Completado |
| H-03 | Diseño de arquitectura y contrato de API | ✅ Completado |
| H-04 | Módulo de gestión (CRUD) | ✅ Completado |
| H-05 | Motor de generación de horarios | ✅ Completado |
| H-06 | Interfaz de usuario (SPA) | ✅ Completado |
| H-07 | Integración completa del sistema | ✅ Completado |
| H-08 | Pruebas del sistema (cero defectos críticos abiertos) | ✅ Completado |
| H-09 | Presentación final y demostración | ✅ Completado |

---

## 6. Desviaciones y Observaciones

* **Datos de entrada (S-01):** se utilizó información académica real de la institución (estructura curricular, prerrequisitos y lógica de planificación), que cubrió aproximadamente el 60% del escenario base; la fracción restante se completó con datos representativos, conforme al plan de contingencia previsto.
* **Optimización global:** el sistema garantiza factibilidad (cumplimiento *hard*), no optimalidad global; documentado como limitación conocida desde el inicio (S-04).
* **Disponibilidad del equipo (R-05):** restricción real gestionada con re-priorización del backlog; no afectó los entregables.

Ninguna desviación comprometió los requisitos de alto nivel ni los criterios de éxito.

---

## 7. Decisión de Cierre

Con base en la verificación anterior —6/6 requisitos de alto nivel, 7/7 criterios de éxito y 6/6 condiciones de aprobación cumplidos— se considera que el proyecto **Planner UC alcanzó los compromisos establecidos en su Acta de Constitución** y queda en condiciones de ser **aceptado y cerrado formalmente**.

---

## 8. Aprobación de Cierre

| Rol | Nombre | Firma | Fecha |
|:----|:-------|:------|:------|
| Gerente de Proyecto | Tapia De La Cruz Jhann Pier | _________________ | 26/06/2026 |
| Patrocinador Académico | Daniel Gamarra Moreno | _________________ | 26/06/2026 |
