# Registro de Impedimentos (Impediment Log)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

Curso: Taller de Proyectos 2 – Ingeniería de Sistemas e Informática
Documento de cierre · Última actualización: 26/06/2026

---

## 1. Objetivo

El presente registro documenta los **impedimentos** que frenaron el progreso del equipo durante el desarrollo de Planner UC. A diferencia del Registro de Incidentes (que documenta problemas técnicos del producto) y del Registro de Defectos (que documenta fallos en el software), este registro se centra en los **obstáculos que bloquearon el avance del equipo** y que requirieron la intervención del Gerente de Proyecto o del Scrum Master para ser removidos.

Documentar y dar seguimiento a los impedimentos de forma temprana permitió identificar bloqueos antes de que afectaran el cronograma del sprint y mantener un flujo de trabajo constante.

---

## 2. Criterios de Clasificación

**Severidad del impedimento:**

* **Alta:** bloquea por completo una o más tareas del sprint; nadie puede avanzar en el ítem afectado.
* **Media:** ralentiza el avance o afecta parcialmente a uno o varios integrantes.
* **Baja:** genera fricción o retrabajo menor sin detener el flujo del sprint.

**Estado del impedimento:**

* **Removido:** el obstáculo fue eliminado y el equipo retomó el avance normal.
* **En gestión:** el equipo está aplicando activamente acciones para removerlo.
* **Escalado:** requiere decisión o recurso fuera del alcance del equipo de desarrollo.

---

## 3. Registro de Impedimentos

| ID   | Fecha detección | Sprint | Impedimento | Severidad | Origen | Responsable de remoción | Acción aplicada | Fecha remoción | Estado |
|:-----|:----------------|:-------|:------------|:----------|:-------|:------------------------|:----------------|:---------------|:-------|
| IMP-01 | 20/04/2026 | Sprint 1 | Salida de un integrante del equipo a inicio del proyecto, dejando sin cubrir parte de las responsabilidades de Backend. | Alta | Equipo | Gerente de Proyecto | Reorganización de roles; el Líder de Desarrollo asumió el Backend y se reasignaron tareas del backlog. | 22/04/2026 | Removido |
| IMP-02 | 23/04/2026 | Sprint 1 | Falta de un contrato de API REST estable bloqueaba el trabajo paralelo entre Frontend y Backend. | Alta | Técnico | Backend Developer | Se definió y publicó el contrato de endpoints (SPEC.md) antes de continuar la implementación paralela. | 26/04/2026 | Removido |
| IMP-03 | 30/04/2026 | Sprint 2 | El pipeline de CI fallaba de forma intermitente (dump del backend, variables de entorno del solver y un test *flaky* en frontend), impidiendo integrar cambios con confianza. | Alta | Infraestructura | QA / Backend | Se corrigió el dump del backend, se externalizaron las variables del solver y se estabilizó el test *flaky*. | 02/05/2026 | Removido |
| IMP-04 | 05/05/2026 | Sprint 2 | Inestabilidad del despliegue por incompatibilidad de red Docker (overlay vs. bridge) en el entorno de Dokploy/Swarm. | Media | Infraestructura | Gerente de Proyecto | Se probó red *bridge* y finalmente se revirtió a *overlay* compatible con Swarm; se documentó la configuración válida. | 08/05/2026 | Removido |
| IMP-05 | 09/05/2026 | Sprint 2 | Configuración divergente de variables de entorno entre desarrollo y producción bloqueaba pruebas reproducibles. | Media | Infraestructura | Project Manager | Unificación mediante Docker Compose y archivos `.env` controlados y versionados. | 11/05/2026 | Removido |
| IMP-06 | 14/05/2026 | Sprint 3 | La credencial del servicio solver estaba embebida en el código, bloqueando la activación del análisis de SonarQube por hallazgo de seguridad. | Media | Técnico | Backend Developer | Se externalizó la credencial a variable de entorno y se corrigió un falso positivo de *password* en los archivos i18n. | 15/05/2026 | Removido |
| IMP-07 | 18/05/2026 | Sprint 3 | Disponibilidad parcial y no uniforme de los integrantes por carga académica de otros cursos, retrasando tareas del sprint. | Media | Equipo | Gerente de Proyecto | Re-priorización del backlog por valor; tareas dimensionadas según disponibilidad real declarada en el sprint planning. | En curso por sprint | En gestión |
| IMP-08 | 25/05/2026 | Sprint 3 | Tiempo de generación del horario cercano al límite de 30 s en escenarios grandes bloqueaba la validación del criterio de éxito RAL-06. | Alta | Técnico | Backend Developer | Se cacheó la disponibilidad en Redis, se optimizó la construcción y se habilitó el portafolio paralelo de ciclos en el solver. | 30/05/2026 | Removido |
| IMP-09 | 02/06/2026 | Sprint 4 | Inestabilidad de los *redirects* de OAuth y de las cookies de autenticación *cross-site* impedía probar flujos autenticados de forma consistente. | Media | Técnico | Backend Developer | Estabilización de *redirects* OAuth y configuración de cookies de autenticación con `forward-headers-strategy` detrás del proxy. | 04/06/2026 | Removido |
| IMP-10 | 10/06/2026 | Sprint 4 | Dependencia entre la confirmación de horario del estudiante y el mecanismo de *hold* de cupo: sin el bloqueo de asientos no se podía cerrar el flujo end-to-end. | Media | Técnico | Backend Developer | Se implementaron `seat_holds` y funciones de *hold* de cupo en BD antes de habilitar la confirmación de opciones de horario. | 16/06/2026 | Removido |

---

## 4. Resumen del Estado de Impedimentos

| Estado | Cantidad |
|:-------|---------:|
| Removidos | 9 |
| En gestión | 1 |
| Escalados | 0 |
| **Total** | **10** |

| Severidad | Cantidad |
|:----------|---------:|
| Alta | 4 |
| Media | 6 |
| Baja | 0 |

---

## 5. Análisis de Impedimentos por Origen

| Origen | Cantidad | Observación |
|:-------|---------:|:------------|
| Infraestructura | 3 | Concentrados en CI/CD y configuración de entornos; mitigados con Docker Compose y estabilización del pipeline. |
| Técnico | 4 | Relacionados con rendimiento del solver, seguridad y autenticación; el de mayor severidad fue el tiempo de generación. |
| Equipo | 2 | Salida de integrante y disponibilidad parcial; gestionados con reorganización de roles y re-priorización. |
| Externo | 1 | Contrato de API como dependencia de coordinación entre módulos. |

---

## 6. Lecciones Aprendidas sobre la Gestión de Impedimentos

* **Definir contratos de integración temprano** (API REST) evita bloqueos de trabajo paralelo entre frontend y backend.
* **Estabilizar el CI antes de escalar funcionalidades** reduce el costo de integración y da confianza para mergear.
* **Reportar bloqueos el mismo día en que se detectan** (supuesto S-06) permitió que la mayoría se removiera en ≤ 3 días.
* La **reorganización ágil de roles** ante la salida de un integrante evitó impacto en los entregables del sprint.

---

## 7. Conclusiones

El seguimiento sistemático de impedimentos permitió remover 9 de 10 obstáculos sin afectar la entrega de los sprints. El único impedimento en gestión continua —la disponibilidad parcial del equipo— se mantuvo bajo control mediante la re-priorización del backlog en cada sprint planning. Ningún impedimento debió escalarse fuera del alcance del equipo, lo que evidencia una capacidad de auto-organización adecuada al contexto académico del proyecto.
