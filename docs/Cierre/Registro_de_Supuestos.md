# Registro de Supuestos – Revisión de Cierre (Assumption Log)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

Curso: Taller de Proyectos 2 – Ingeniería de Sistemas e Informática
Documento de cierre · Última actualización: 26/06/2026

> Este documento es la **revisión de cierre** del registro original elaborado en el Sprint 0
> (`docs/Sprint_0/Registro_de_supuestos_y_restricciones.md`). Su propósito es evaluar, para cada
> supuesto y restricción, si la premisa **se cumplió** durante el desarrollo, dejando documentación
> útil para futuros proyectos que quieran aprender del proceso actual.

---

## 1. Objetivo

El Registro de Supuestos documenta las premisas asumidas al inicio del proyecto y que condicionaron las decisiones de diseño y planificación. En la fase de cierre se revisa cada supuesto para determinar si **se confirmó**, **se confirmó parcialmente** o **no se cumplió**, registrando la evidencia y el aprendizaje derivado.

**Leyenda de resultado:**

* ✅ **Confirmado:** el supuesto se mantuvo válido durante todo el proyecto.
* 🟡 **Parcial:** el supuesto se cumplió con matices o requirió activar contingencia.
* ❌ **No cumplido:** el supuesto resultó falso y obligó a un cambio de enfoque.

---

## 2. Revisión de Supuestos

| ID | Supuesto (resumen) | Resultado | Evidencia al cierre | Aprendizaje |
|:---|:-------------------|:----------|:--------------------|:------------|
| S-01 | Disponibilidad de información académica base suficiente. | 🟡 Parcial | Se incorporó información académica real de la institución —su estructura curricular, prerrequisitos y lógica de planificación—, la cual cubrió aproximadamente el 60% del escenario base. La fracción restante se completó con datos representativos generados por el equipo para alcanzar las dimensiones del escenario de prueba (≤50 est., ≤20 doc., ≤30 cursos, ≤20 aulas). | La disponibilidad parcial de datos institucionales es un escenario habitual; combinar la información real existente con datos representativos permite validar el sistema sin bloquear el desarrollo. |
| S-02 | Simplificación controlada del problema en las primeras iteraciones. | ✅ Confirmado | El Sprint 1 abordó solo restricciones *hard*; las *soft* (equidad de carga, preferencias) se incorporaron en iteraciones posteriores. | El enfoque incremental sobre el CSP fue clave para obtener una primera solución funcional. |
| S-03 | Priorización de restricciones según su criticidad (hard vs. soft). | ✅ Confirmado | El modelo CSP clasifica explícitamente cada restricción; el motor garantiza el 100% de *hard* antes de evaluar *soft*. | Separar *hard* y *soft* redujo la complejidad y habilitó el cumplimiento del límite de tiempo. |
| S-04 | Generar horarios válidos antes que plenamente óptimos. | ✅ Confirmado | El solver produce soluciones factibles (cero violaciones *hard*); la no optimización global quedó documentada como limitación conocida. | Para un PMV, factibilidad y consistencia priman sobre optimalidad global. |
| S-05 | Aceptación de una primera versión centrada en lo esencial. | ✅ Confirmado | El PMV es demostrable con los RF implementados y resuelve el caso base de planificación. | El valor del PMV se validó con el flujo núcleo: registrar entidades → validar → generar sin conflictos. |
| S-06 | Coordinación continua del equipo (rituales Scrum). | 🟡 Parcial | Se mantuvieron los rituales, pero la disponibilidad fue parcial (ver IMP-07); los bloqueos se reportaron mayormente el mismo día. | Reportar bloqueos el mismo día permitió remover impedimentos en ≤ 3 días en promedio. |
| S-07 | Suficiencia de la solución web (SPA + API REST). | ✅ Confirmado | El sistema opera en navegadores actuales sin instalación adicional; arquitectura desacoplada Next.js + Spring Boot + FastAPI. | La web fue suficiente para el alcance del PMV; no se requirió app nativa. |
| S-08 | Validación inicial con escenarios representativos. | ✅ Confirmado | Las pruebas de aceptación usan el escenario base documentado en el repositorio. | Un escenario acotado pero representativo fue suficiente para validar la lógica del dominio. |
| S-09 | Gestión de cambios sin alterar la finalidad del proyecto. | ✅ Confirmado | Los cambios de alcance se registraron en el backlog y se aprobaron en revisión de sprint. | La gestión ágil del backlog contuvo el *scope creep* sin perder el propósito central. |
| S-10 | El sistema como herramienta de apoyo, no de reemplazo. | ✅ Confirmado | La confirmación del horario requiere acción explícita del coordinador; el sistema introdujo además el *hold* de cupo para el flujo del estudiante. | Mantener al humano en el bucle de decisión aumentó la confianza en el resultado generado. |

---

## 3. Revisión de Restricciones

| ID | Restricción (resumen) | Resultado | Evidencia al cierre |
|:---|:----------------------|:----------|:--------------------|
| R-01 | Cumplimiento obligatorio de restricciones *hard* del dominio. | ✅ Confirmado | Pruebas automatizadas de detección de solapamientos: 100% de horarios válidos pasan la validación *hard*. |
| R-02 | Tiempo limitado al período académico del curso. | ✅ Confirmado | Hitos H-01 a H-09 ejecutados dentro del calendario de sprints. |
| R-03 | Alcance limitado a un PMV. | ✅ Confirmado | El backlog distingue ítems del PMV de los fuera de alcance; estos no se planificaron. |
| R-04 | Capacidad computacional moderada. | ✅ Confirmado | El solver corre en equipos de desarrollo estándar; se optimizó con caché Redis y paralelismo de ciclos. |
| R-05 | Disponibilidad parcial de los integrantes. | 🟡 Parcial | Restricción real durante todo el proyecto (IMP-07); gestionada con re-priorización del backlog por sprint. |
| R-06 | Dependencia de la calidad de los datos de entrada. | ✅ Confirmado | El módulo de gestión valida integridad referencial antes de habilitar la generación. |
| R-07 | Necesidad de equidad en la asignación de recursos. | ✅ Confirmado | La equidad de carga docente se implementó como *soft constraint* dentro del modelo CSP. |
| R-08 | Requerimientos de seguridad y protección de datos. | ✅ Confirmado | JWT con expiración, hash de contraseñas, control por roles y análisis OWASP/SonarQube aplicados. |
| R-09 | Trazabilidad y control del trabajo en GitHub. | ✅ Confirmado | Desarrollo versionado, cambios vía *pull requests* y CI con GitHub Actions. |
| R-10 | Multiplicidad de actores con necesidades distintas. | ✅ Confirmado | Vistas y permisos diferenciados para Estudiante, Docente, Coordinador y Administrador. |

---

## 4. Resumen de la Revisión

| Categoría | Confirmados ✅ | Parciales 🟡 | No cumplidos ❌ |
|:----------|:-------------:|:------------:|:--------------:|
| Supuestos (S-01 a S-10) | 8 | 2 | 0 |
| Restricciones (R-01 a R-10) | 9 | 1 | 0 |

---

## 5. Conclusiones

La mayoría de los supuestos y restricciones definidos en el Sprint 0 se confirmaron a lo largo del proyecto, lo que indica una planificación inicial realista. Los tres elementos clasificados como **parciales** (S-01 disponibilidad de datos institucionales, S-06/R-05 disponibilidad del equipo) se gestionaron con sus contingencias previstas —combinación de la data académica real existente con datos representativos complementarios y re-priorización del backlog— sin comprometer la entrega del PMV. Ningún supuesto resultó completamente falso, por lo que no fue necesario un cambio de enfoque estructural. Estos hallazgos constituyen una referencia útil para futuros proyectos académicos con motor CSP y equipos de dedicación parcial.
