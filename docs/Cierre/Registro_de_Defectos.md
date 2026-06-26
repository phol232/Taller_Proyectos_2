# Registro de Defectos (Defect Log)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

Curso: Taller de Proyectos 2 – Ingeniería de Sistemas e Informática
Documento de cierre · Última actualización: 26/06/2026

---

## 1. Objetivo

El presente registro documenta los **defectos** detectados en el software durante el desarrollo de Planner UC, permitiendo identificarlos temprano en el proceso para corregirlos rápidamente. Cada defecto fue registrado con su descripción, severidad, módulo afectado, mecanismo de detección y acción de corrección, manteniendo la trazabilidad entre el defecto y el cambio que lo resolvió.

A diferencia del Registro de Impedimentos (obstáculos del equipo), este registro se centra exclusivamente en **fallos del producto**: comportamientos del sistema que no cumplen el resultado esperado.

---

## 2. Criterios de Clasificación

**Severidad:**

* **Crítica:** impide el uso de una funcionalidad central o compromete la seguridad / integridad de datos.
* **Alta:** funcionalidad importante no opera correctamente, sin *workaround* razonable.
* **Media:** comportamiento incorrecto con *workaround* o de impacto acotado.
* **Baja:** defecto cosmético o de bajo impacto en la experiencia.

**Mecanismo de detección:**

* Pruebas automatizadas (unitarias, integración, E2E)
* Análisis estático / seguridad (SonarQube, OWASP, axe-core WCAG)
* Pruebas manuales / revisión de QA
* Uso durante demostración o integración

**Estado:** Corregido · Verificado · Abierto

---

## 3. Registro de Defectos

| ID | Fecha | Módulo | Descripción del defecto | Severidad | Detección | Acción correctiva | Estado |
|:---|:------|:-------|:------------------------|:----------|:----------|:------------------|:-------|
| DEF-01 | 24/04/2026 | Backend / CRUD | Validaciones inconsistentes en las operaciones CRUD de estudiantes, docentes, cursos y aulas. | Alta | Pruebas de integración | Se corrigieron las validaciones y se añadieron pruebas unitarias e integración a los módulos CRUD. | Verificado |
| DEF-02 | 28/04/2026 | Solver CSP | El validador aceptaba combinaciones inválidas de sesiones PRÁCTICA + TEORÍA (transición T→P no validada como restricción hard). | Alta | Pruebas del solver | Se corrigió el validador para rechazar la transición T→P y otras restricciones hard del dominio. | Verificado |
| DEF-03 | 30/04/2026 | Backend / Cursos | Error al crear un curso por falta de cobertura en el flujo de alta. | Media | Pruebas (JaCoCo / cobertura) | Se corrigió el flujo de creación de curso y se aumentó la cobertura del módulo. | Verificado |
| DEF-04 | 03/05/2026 | Base de datos | Las funciones de borrado en BD no eliminaban correctamente los registros dependientes. | Alta | Pruebas de integración (Testcontainers) | Se corrigieron las funciones de borrado y se añadieron pruebas de integración en backend. | Verificado |
| DEF-05 | 06/05/2026 | Frontend / Tests | Test *flaky* en frontend producía fallos intermitentes en CI. | Media | Pipeline CI | Se estabilizó el test eliminando la dependencia temporal no determinista. | Verificado |
| DEF-06 | 07/05/2026 | Frontend / Cursos | Loop infinito en la resolución de prerrequisitos al construir el horario. | Crítica | Pruebas manuales / E2E | Se corrigió el algoritmo de resolución de prerrequisitos para evitar la recursión sin término. | Verificado |
| DEF-07 | 07/05/2026 | Backend / Cursos | Los códigos de prerrequisitos no aparecían en la lista paginada de cursos. | Media | Pruebas de integración | Se ajustó la consulta para incluir los códigos de prerrequisitos en la respuesta paginada. | Verificado |
| DEF-08 | 09/05/2026 | Seguridad / i18n | Credencial del solver embebida en código y falso positivo de *password* en archivos i18n (hallazgo SonarQube/OWASP). | Crítica | Análisis estático (SonarQube/OWASP) | Se externalizó la credencial a variable de entorno y se corrigió el falso positivo en i18n. | Verificado |
| DEF-09 | 12/05/2026 | Frontend / Accesibilidad | Hallazgos de accesibilidad WCAG (contraste, etiquetas, foco) en varias vistas. | Media | Análisis axe-core (WCAG) | Se corrigieron los hallazgos y se incorporó una suite axe-core al pipeline de pruebas. | Verificado |
| DEF-10 | 14/05/2026 | Frontend / UI | Colores *hardcodeados* y archivos de depuración fuera de la guía de estilos. | Baja | Revisión de QA | Se reemplazaron por tokens del sistema de diseño y se eliminaron los archivos debug. | Verificado |
| DEF-11 | 16/05/2026 | Seguridad / Auth | Validaciones de contraseña no estrictas (se aceptaban contraseñas débiles). | Alta | Pruebas de seguridad | Se implementaron validaciones estrictas de contraseña en frontend y backend. | Verificado |
| DEF-12 | 18/05/2026 | Frontend / Login | Mensaje de error duplicado en la pantalla de inicio de sesión. | Baja | Pruebas manuales | Se corrigió la lógica de presentación para mostrar un único mensaje. | Verificado |
| DEF-13 | 22/05/2026 | Frontend / Tiempo real | Los borradores de horario no se actualizaban en tiempo real y requerían recargar la página. | Media | Pruebas manuales / E2E | Se corrigió la actualización reactiva del borrador sin recarga (SSE). | Verificado |
| DEF-14 | 24/05/2026 | Backend / SSE | Cabeceras SSE, *heartbeat* y recarga en reconexión incorrectos, cortando el flujo en tiempo real. | Media | Pruebas de integración | Se ajustaron cabeceras SSE, *heartbeat* y recarga en reconexión. | Verificado |
| DEF-15 | 02/06/2026 | Seguridad / OAuth | *Redirects* de OAuth y cookies de autenticación *cross-site* inestables tras el login. | Alta | Pruebas E2E / manuales | Se estabilizaron los *redirects* OAuth y la estrategia de cabeceras tras el proxy (HTTPS/Traefik). | Verificado |
| DEF-16 | 10/06/2026 | Frontend / Listados | La lista se recargaba mientras había un modal abierto, perdiendo el contexto del usuario. | Baja | Pruebas manuales | Se evitó la recarga de la lista mientras existe un modal abierto. | Verificado |

---

## 4. Resumen del Estado de Defectos

| Estado | Cantidad |
|:-------|---------:|
| Verificados (corregidos y comprobados) | 16 |
| Abiertos | 0 |
| **Total** | **16** |

| Severidad | Cantidad |
|:----------|---------:|
| Crítica | 2 |
| Alta | 5 |
| Media | 6 |
| Baja | 3 |

---

## 5. Defectos por Mecanismo de Detección

| Mecanismo | Cantidad | Observación |
|:----------|---------:|:------------|
| Pruebas automatizadas (unitarias/integración/E2E) | 8 | Mayor fuente de detección; respalda la meta de cobertura ≥ 70% en módulos críticos. |
| Análisis estático / seguridad (SonarQube, OWASP, axe-core) | 3 | Detectó la credencial embebida y los hallazgos WCAG antes de la entrega. |
| Pruebas manuales / revisión de QA | 5 | Capturó defectos de UI y de experiencia no cubiertos por automatización. |

---

## 6. Indicadores de Calidad

* **Densidad de defectos críticos al cierre:** 0 defectos críticos abiertos (criterio H-08 cumplido).
* **Tasa de corrección:** 100% de los defectos registrados fueron corregidos y verificados.
* **Detección temprana:** el 69% de los defectos (11/16) se detectó mediante pruebas automatizadas o análisis estático, antes de llegar a producción/demostración.

---

## 7. Lecciones Aprendidas

* La introducción de **pruebas de integración con Testcontainers** y de la **suite axe-core** desplazó la detección de defectos hacia fases tempranas.
* Los **defectos de seguridad** (credencial embebida, contraseñas débiles, OAuth) justifican mantener el análisis estático como *gate* del pipeline.
* Defectos críticos como el **loop infinito de prerrequisitos** refuerzan la necesidad de pruebas E2E sobre los flujos núcleo del producto.

---

## 8. Conclusiones

Al cierre del proyecto no existen defectos críticos ni de alta severidad abiertos. La totalidad de los defectos registrados fue corregida y verificada, en su mayoría detectados de forma temprana por la batería de pruebas automatizadas y el análisis estático. Esto respalda el cumplimiento del criterio de aprobación de cero defectos críticos abiertos y la cobertura objetivo en los módulos críticos del sistema.
