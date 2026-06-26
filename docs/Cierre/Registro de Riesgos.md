# Registro de Riesgos del Proyecto

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

---

# 1. Objetivo

El presente registro documenta los riesgos identificados durante el desarrollo del proyecto Planner UC, incluyendo su probabilidad, impacto, prioridad, estrategia de respuesta, responsable y estado final.

La gestión de riesgos permitió reducir la incertidumbre durante el desarrollo del sistema, priorizando aquellos eventos que podían afectar el cronograma, la calidad, el alcance y el desempeño del motor de generación automática de horarios basado en satisfacción de restricciones (CSP).

---

# 2. Criterios de Priorización

Cada riesgo fue evaluado considerando dos variables principales:

* **Probabilidad:** posibilidad de ocurrencia del riesgo.
* **Impacto:** efecto esperado sobre el proyecto si el riesgo llegaba a materializarse.

La prioridad fue determinada mediante una matriz de riesgo, clasificando los riesgos en niveles **Alto**, **Muy Alto** y **Crítico**, permitiendo asignar recursos y acciones preventivas de acuerdo con su importancia.

---

# 3. Registro de Riesgos

| ID  | Riesgo                                                                                 | Categoría  | Probabilidad | Impacto   | Prioridad | Responsable     | Estrategia de respuesta                                                                                          | Estado Final |
| --- | -------------------------------------------------------------------------------------- | ---------- | ------------ | --------- | --------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| R01 | Dificultad en la implementación del algoritmo CSP.                                     | Cronograma | Muy Alta     | Crítico   | Muy Alto  | Backend Dev     | Desarrollo incremental del algoritmo, validación por fases y pruebas continuas del solver.                       | Cerrado      |
| R02 | Cambios frecuentes en los requisitos académicos que afectan las restricciones del CSP. | Alcance    | Alta         | Muy Serio | Muy Alto  | Project Manager | Aplicación de Spec-Driven Development y validación continua de especificaciones antes del desarrollo.            | Cerrado      |
| R03 | Conflictos por acceso concurrente a recursos (docentes, aulas y horarios).             | Calidad    | Alta         | Muy Serio | Muy Alto  | Backend Dev     | Implementación de transacciones y validaciones para evitar asignaciones simultáneas inconsistentes.              | Cerrado      |
| R04 | Vulnerabilidades de seguridad que comprometan la información académica.                | Calidad    | Muy Alta     | Crítico   | Muy Alto  | Backend Dev     | Aplicación de controles OWASP Top 10, validación de entradas y autenticación segura mediante JWT.                | Cerrado      |
| R05 | Bajo rendimiento del sistema debido al algoritmo CSP o consultas ineficientes.         | Calidad    | Alta         | Muy Serio | Muy Alto  | Backend Dev     | Optimización de consultas PostgreSQL y aplicación de heurísticas en el solver CSP.                               | Cerrado      |
| R06 | Falta de coordinación entre los miembros del equipo.                                   | Cronograma | Media        | Serio     | Alto      | Project Manager | Reuniones de seguimiento, planificación semanal y control continuo del avance del Sprint.                        | Cerrado      |
| R07 | Inconsistencia de datos por manejo incorrecto de transacciones.                        | Calidad    | Baja         | Crítico   | Alto      | Backend Dev     | Implementación de transacciones ACID y validaciones de integridad en la base de datos.                           | Cerrado      |
| R08 | Limitada experiencia del equipo en nuevas tecnologías.                                 | Cronograma | Media        | Serio     | Alto      | Project Manager | Capacitación rápida, división modular del proyecto y revisión colaborativa del código.                           | Cerrado      |
| R09 | Requisitos inicialmente poco definidos.                                                | Alcance    | Alta         | Muy Serio | Muy Alto  | Project Manager | Definición explícita de restricciones mediante Spec-Driven Development y refinamiento continuo del backlog.      | Cerrado      |
| R10 | Problemas de concurrencia durante la asignación de horarios.                           | Calidad    | Alta         | Muy Serio | Muy Alto  | Backend Dev     | Implementación de control transaccional y mecanismos de concurrencia para la reserva y confirmación de recursos. | Cerrado      |

---

# 4. Riesgos Priorizados

Durante el proyecto se identificaron cuatro riesgos considerados críticos por su impacto directo sobre el funcionamiento del sistema:

* **R01:** Complejidad técnica del algoritmo CSP, núcleo funcional del sistema.
* **R02:** Cambios en las reglas académicas que modifican las restricciones utilizadas por el solver.
* **R03:** Acceso concurrente a recursos académicos, con riesgo de generar conflictos en las asignaciones.
* **R04:** Vulnerabilidades de seguridad que podrían afectar la integridad y confidencialidad de la información.

Estos riesgos recibieron seguimiento permanente durante las reuniones de planificación y revisión de cada Sprint.

---

# 5. Respuestas Aplicadas

Las principales estrategias implementadas para mitigar los riesgos fueron:

* Desarrollo incremental del motor CSP mediante prototipos funcionales.
* Aplicación de Spec-Driven Development para reducir cambios de requisitos durante el desarrollo.
* Implementación de autenticación basada en JWT y controles alineados con OWASP Top 10.
* Uso de transacciones ACID y mecanismos de control de concurrencia para preservar la consistencia de los datos.
* Optimización de consultas PostgreSQL y aplicación de heurísticas para mejorar el rendimiento del solver.
* Seguimiento continuo mediante reuniones Scrum y revisión periódica del avance del proyecto.

---

# 6. Estado Final de los Riesgos

Al cierre del Sprint 3 y en desarrollo del sprint 4 el proyecto presenta la siguiente situación:

| Estado   | Cantidad |
| -------- | -------: |
| Activos  |        0 |
| Cerrados |        10 |

Los riesgos cerrados corresponden principalmente a aspectos relacionados con organización del equipo, definición de requisitos, rendimiento inicial e integridad transaccional, al desarrollo del motor CSP, las validaciones académicas y el manejo de concurrencia.

---

# 7. Conclusiones

La gestión de riesgos permitió anticipar los principales problemas técnicos y organizacionales del proyecto Planner UC, definiendo estrategias de mitigación antes de que impactaran significativamente el desarrollo.

La priorización basada en probabilidad e impacto facilitó concentrar los esfuerzos en los riesgos asociados al algoritmo CSP, la seguridad, la concurrencia y la estabilidad del sistema. Como resultado, todos los riesgos fueron mitigados durante el desarrollo de los Sprints, 
