# Gestión de Riesgos y Oportunidades — Planner UC

**Proyecto:** Sistema de Generación Óptima de Horarios Académicos (Planner UC)  
**Curso:** Taller de Proyectos 2  
**Gerente de Proyecto:** Tapia De La Cruz Jhann Pier  
**Fecha:** Mayo 2026

---

## 1. Registro de Riesgos

### Escala de valoración

| Valor | Probabilidad | Impacto |
|:---:|---|---|
| 1 | Muy baja | Muy bajo |
| 2 | Baja | Bajo |
| 3 | Media | Moderado |
| 4 | Alta | Alto |
| 5 | Muy alta | Muy alto |

**Nivel de riesgo = Probabilidad × Impacto**

| Rango | Clasificación |
|:---:|---|
| 1 – 4 | Bajo |
| 5 – 9 | Moderado |
| 10 – 14 | Alto |
| 15 – 25 | Crítico |

---

### Matriz de Riesgos

| ID | Descripción del riesgo | Causa | Prob. | Impacto | Nivel | Estrategia de mitigación |
|---|---|---|:---:|:---:|:---:|---|
| R-01 | La complejidad del modelado CSP supera la capacidad técnica del equipo | El equipo no cuenta con experiencia previa en algoritmos de satisfacción de restricciones | 4 | 5 | **20** | Iniciar la implementación con un modelo reducido que contemple únicamente las restricciones duras fundamentales (H1 y H2), e incorporar las restricciones blandas de forma incremental en sprints posteriores una vez estabilizado el modelo base. |
| R-02 | La disponibilidad parcial de los integrantes compromete el cumplimiento del cronograma | Los cuatro miembros del equipo tienen responsabilidades académicas paralelas que limitan su dedicación al proyecto | 5 | 4 | **20** | Planificar cada sprint considerando la capacidad real declarada por cada integrante. Identificar y priorizar las tareas críticas en la ceremonia de sprint planning para garantizar el avance de los entregables de mayor valor. |
| R-03 | El microservicio solver no está disponible cuando el backend requiere invocarlo | El solver opera como proceso independiente; si no se encuentra activo o no responde dentro del tiempo límite, el backend no puede ejecutar la generación de horarios | 4 | 5 | **20** | Establecer desde el Sprint 1 el contrato de invocación del solver (URL, parámetros de entrada, formato de respuesta y códigos de error esperados). Implementar en el backend un mecanismo de fallback que permita la asignación manual de horarios cuando el servicio solver no esté disponible. |
| R-04 | El algoritmo de generación supera el tiempo límite de 30 segundos para el escenario base del PMV | El espacio de búsqueda del problema CSP crece exponencialmente con el número de variables; un algoritmo de backtracking sin poda eficiente no alcanza el umbral de rendimiento requerido | 3 | 4 | **12** | Incorporar la heurística MRV (Minimum Remaining Values) desde el primer prototipo del solver para reducir el espacio de búsqueda. Medir y registrar el tiempo de ejecución al cierre de cada sprint que involucre el solver. |
| R-05 | Cambios en los requisitos durante el desarrollo generan retrabajo y afectan el cronograma | El alcance del proyecto puede ser modificado por decisión del equipo o por indicaciones del docente evaluador durante el período de desarrollo | 4 | 3 | **12** | Todo cambio de alcance debe ser aprobado por el Gerente de Proyecto y registrado formalmente en el backlog. Los cambios aceptados se planifican para el siguiente sprint, sin interrumpir el sprint en curso. |
| R-06 | La ausencia de un dataset de prueba representativo impide validar el solver | El equipo no genera con anticipación el conjunto de datos necesario para ejecutar y evaluar el comportamiento del motor de generación | 3 | 4 | **12** | Incluir como tarea explícita en el Sprint 2 la construcción del dataset base conforme a los límites del PMV: hasta 50 estudiantes, 20 docentes, 30 cursos y 20 aulas, con disponibilidades y compatibilidades completas. |
| R-07 | Inconsistencias entre el frontend y el backend por desarrollo en paralelo sin contrato definido | El desarrollo simultáneo de ambas capas sin una especificación compartida de la API puede generar incompatibilidades en formatos de datos y contratos de respuesta | 3 | 3 | **9** | Definir y documentar el contrato REST (endpoints, DTOs y códigos HTTP) antes de iniciar el desarrollo en paralelo. Utilizar la interfaz Swagger UI del backend como referencia única durante la implementación del frontend. |
| R-08 | Pérdida de trabajo por conflictos en el repositorio de control de versiones | La ausencia de una estrategia de branching acordada puede generar sobreescrituras y merges conflictivos entre los integrantes del equipo | 3 | 3 | **9** | Aplicar la estrategia de ramas establecida en el proyecto: ramas `main`, `develop` y `feature/*`. Todo cambio debe incorporarse a través de un pull request revisado por al menos un integrante distinto al autor. |
| R-09 | La salida o reducción significativa de participación de un integrante afecta la continuidad del desarrollo | Situaciones personales o académicas imprevistas pueden reducir la capacidad operativa del equipo durante un sprint | 2 | 5 | **10** | Documentar las decisiones técnicas y el diseño de cada módulo en el repositorio del proyecto. Ningún módulo crítico debe depender exclusivamente del conocimiento de un solo integrante sin respaldo documental. |
| R-10 | La cobertura de pruebas no alcanza el umbral mínimo del 70% en módulos críticos al cierre del proyecto | El equipo posterga la escritura de pruebas para los últimos sprints priorizando el avance funcional | 3 | 3 | **9** | Incluir tareas de prueba como parte integral de cada historia de usuario desde el inicio del proyecto. El responsable de QA verifica la cobertura acumulada al cierre de cada sprint. |

---

### Riesgos priorizados (Nivel ≥ 10)

| Prioridad | ID | Descripción resumida | Nivel |
|:---:|---|---|:---:|
| 1 | R-01 | Complejidad del modelado CSP supera la capacidad técnica del equipo | **20 — Crítico** |
| 2 | R-02 | Disponibilidad parcial de los integrantes compromete el cronograma | **20 — Crítico** |
| 3 | R-03 | Microservicio solver no disponible al momento de ser invocado por el backend | **20 — Crítico** |
| 4 | R-04 | Tiempo de ejecución del solver supera el límite de 30 segundos | **12 — Alto** |
| 5 | R-05 | Cambios de requisitos generan retrabajo durante el desarrollo | **12 — Alto** |
| 6 | R-06 | Dataset de prueba no disponible para validar el solver | **12 — Alto** |
| 7 | R-09 | Salida o reducción de participación de un integrante del equipo | **10 — Alto** |

---

## 2. Registro de Oportunidades

| ID | Oportunidad | Impacto positivo esperado | Estrategia de aprovechamiento |
|---|---|---|---|
| O-01 | El diseño del solver CSP se encuentra documentado previamente a su implementación | Reduce el tiempo de análisis durante el sprint de implementación y disminuye el riesgo de rediseño en etapas avanzadas del proyecto | Utilizar el documento `docs/Planificación/Diseno_Microservicio_Solver_CSP.md` como especificación de entrada para el sprint del solver, el cual describe el modelo de componentes, las restricciones H1–H16 y el algoritmo de búsqueda. |
| O-02 | El equipo cuenta con experiencia previa en las tecnologías base del sistema (Spring Boot y PostgreSQL) | Reduce la curva de aprendizaje y el tiempo de configuración de los módulos de mayor peso en el sistema, permitiendo avanzar con mayor velocidad en los primeros sprints | Asignar las tareas de backend y base de datos a los integrantes con mayor dominio de estas tecnologías. Reservar los primeros sprints para consolidar la arquitectura antes de incorporar el solver. |
| O-03 | El entorno de desarrollo está contenedorizado mediante Docker Compose desde el inicio del proyecto | Garantiza que todos los integrantes trabajen sobre el mismo entorno de ejecución, eliminando inconsistencias entre máquinas y reduciendo el tiempo de configuración inicial | Documentar el procedimiento de arranque del entorno en el README del repositorio y establecer su uso como estándar desde el Sprint 1. |
| O-04 | Los límites del PMV están definidos con precisión desde el inicio del proyecto | Permite dimensionar correctamente el dataset de prueba y las pruebas de rendimiento del solver sin necesidad de escalar el problema antes de validar el modelo base | Construir el dataset de referencia conforme a los límites establecidos (≤ 50 estudiantes, ≤ 20 docentes, ≤ 30 cursos, ≤ 20 aulas) y emplearlo de manera consistente en todas las pruebas y demostraciones del proyecto. |
| O-05 | El Project Charter y los acuerdos del equipo están formalizados desde el Sprint 0 | Proporciona una base de referencia clara para la resolución de conflictos sobre alcance, roles y prioridades, reduciendo el riesgo de decisiones informales que afecten el cronograma | Revisar el Project Charter al inicio de cada sprint para verificar que el avance del equipo mantiene coherencia con los objetivos y criterios de éxito establecidos. |
| O-06 | La rúbrica del curso evalúa artefactos de proceso además del producto entregado | La documentación de planificación, gestión de riesgos, especificaciones y trazabilidad contribuye directamente a la calificación del proyecto | Mantener los documentos de la carpeta `docs/` actualizados al cierre de cada sprint, tratando la documentación como un entregable continuo y no como una actividad final. |

---

## 3. Análisis de Riesgos

### 3.1. Relación con restricciones del problema CSP

Los riesgos de mayor nivel están directamente vinculados con la naturaleza combinatoria del problema de generación de horarios. El problema CSP involucrado es NP-difícil en su forma general, lo que implica que la complejidad de búsqueda escala de forma no lineal con el número de variables y restricciones.

| Restricción CSP | Riesgo relacionado | Relación |
|---|---|---|
| H1, H2 — Sin solapamiento de docente ni aula | R-01, R-04 | La correcta implementación de estas restricciones exige modelar el espacio de búsqueda de forma eficiente. Sin poda adecuada, el backtracking puede superar el tiempo límite de 30 segundos. |
| H3, H4 — Disponibilidad de docente y aula | R-06 | Si el dataset de prueba no registra disponibilidades completas, estas restricciones no pueden validarse, invalidando los resultados de la prueba del solver. |
| H7 — Horas exactas por componente | R-04 | Incrementa la dimensión del espacio de búsqueda al agregar una condición de cardinalidad estricta por variable, lo que aumenta el costo computacional del backtracking. |
| H14 — Atomicidad de cursos compuestos | R-01 | Requiere que el solver gestione asignaciones grupales con reversión parcial en caso de fallo, lo cual representa una de las funcionalidades más complejas del modelo. |
| Restricciones blandas S1–S6 | R-04, R-05 | La incorporación prematura de restricciones blandas antes de estabilizar las restricciones duras incrementa la complejidad del modelo y puede comprometer el cumplimiento del tiempo límite. |

La estrategia de mitigación transversal para este grupo de riesgos consiste en priorizar soluciones factibles sobre soluciones óptimas, conforme al supuesto S-04 del Registro de Supuestos del proyecto.

---

### 3.2. Relación con limitaciones técnicas del proyecto

| Limitación técnica | Riesgo relacionado | Mitigación aplicada |
|---|---|---|
| El solver CSP opera como microservicio independiente; el backend se comunica con él mediante llamadas HTTP | R-03 — Solver no disponible al momento de ser invocado | El backend debe gestionar el escenario de no disponibilidad del solver mediante un timeout definido, un mensaje descriptivo al Coordinador y un mecanismo de fallback para asignación manual. |
| El equipo está conformado por cuatro integrantes con dedicación parcial al proyecto | R-02 — Cronograma comprometido por disponibilidad parcial | Los sprints se dimensionan conforme a la capacidad real del equipo. Las tareas de la ruta crítica se identifican y priorizan en cada ceremonia de planificación. |
| La ejecución del solver se realizará sobre equipos de cómputo estándar sin hardware especializado | R-04 — Tiempo de ejecución fuera del umbral requerido | El diseño del algoritmo debe operar dentro de los límites de hardware disponible. Las soluciones que requieran procesamiento intensivo quedan fuera del alcance del PMV. |
| Solo uno de los integrantes cuenta con experiencia en el stack del solver (Python / FastAPI) | R-03, R-09 | El diseño del solver debe estar completamente documentado antes de su implementación, de manera que otro integrante pueda continuar el desarrollo en caso de ser necesario. |
| La cobertura mínima de pruebas del 70% en módulos críticos es un criterio de aceptación del proyecto | R-10 — Cobertura insuficiente al cierre | Las pruebas se integran como parte de cada historia de usuario desde el inicio. El responsable de QA verifica la cobertura acumulada al cierre de cada sprint. |

---

### 3.3. Relación con dependencias externas

| Dependencia externa | Riesgo relacionado | Estrategia |
|---|---|---|
| Demostración funcional ante el docente evaluador al cierre del proyecto | R-01, R-04 | El motor de generación debe producir al menos el horario del escenario base antes de la entrega final. En caso de que el solver no esté operativo, el mecanismo de asignación manual sirve como alternativa para la demostración. |
| Plazo académico fijo establecido por el curso | R-02, R-05 | El cronograma de hitos definido en el Project Charter (H-01 a H-09) constituye la referencia de control del proyecto. Los cambios de alcance solo pueden incorporarse con aprobación del Gerente de Proyecto y en el sprint siguiente al que se solicitan. |
| Herramientas de gestión y colaboración de terceros (GitHub, Docker, Jira, Google Drive) | R-08 | Las herramientas seleccionadas cuentan con planes gratuitos o educativos y son conocidas por el equipo. El riesgo de indisponibilidad de plataforma se considera bajo. |
| Disponibilidad de datos académicos reales para las pruebas del sistema | R-06 | Según el supuesto S-01 del Registro de Supuestos, si los datos reales no están disponibles a tiempo, se utilizará un dataset sintético representativo construido por el equipo. |
| Disponibilidad del docente evaluador para las revisiones de sprint | R-05 | Las revisiones de sprint están planificadas con anticipación. Los cambios de alcance derivados de esas revisiones se procesan en la siguiente ceremonia de planificación. |
