# Rúbrica Operativa para Agente IA — Taller de Proyectos 2

**Curso:** Taller de Proyectos 2 – Ingeniería de Sistemas e Informática  
**Proyecto:** Sistema de Generación Óptima de Horarios Académicos en Entornos de Currículo Flexible  
**Enfoque:** Planificación, Spec-Driven Development, Gestión del Repositorio, Costos, Riesgos y Evidencia de Desarrollo

---

## 1. Objetivo del trabajo

El agente IA debe ayudar a construir, ordenar, revisar y mejorar los artefactos exigidos por la rúbrica del curso.  
El objetivo no es producir teoría extensa, sino generar documentación clara, trazable y útil para evidenciar que el proyecto fue planificado, modelado, implementado y gestionado de manera profesional.

El proyecto debe tratarse como un problema complejo de ingeniería, no como una solución trivial.  
Debe evidenciar:

- Modelado del problema.
- Análisis de restricciones.
- Toma de decisiones técnicas.
- Planificación ágil.
- Gestión de costos.
- Gestión de riesgos y oportunidades.
- Especificación formal mediante Spec-Driven Development.
- Uso profesional de GitHub.
- Trazabilidad entre backlog, commits, pull requests y funcionalidades.

---

## 2. Entregables principales

El agente IA debe trabajar sobre los siguientes archivos y carpetas sugeridas:

```text
/docs
  01-planificacion-jira.md
  02-metricas-agiles.md
  03-presupuesto.md
  04-riesgos-oportunidades.md
  05-spec.md
  06-constitution.md
  07-trazabilidad.md
  08-decisiones-tecnicas.md
README.md
```

También puede ayudar a generar:

```text
/.github
  pull_request_template.md
  ISSUE_TEMPLATE/
    user-story.md
    bug-report.md
```

---

# 3. Criterios de evaluación convertidos en tareas para el agente IA

---

## 3.1. Planificación del proyecto en Jira

### Lo que pide la rúbrica

Se debe presentar una planificación estructurada y coherente con la complejidad del problema CSP/timetabling.

Debe incluir:

- Backlog completo.
- Historias de usuario bien formuladas.
- Priorización basada en valor, riesgo y complejidad.
- Relación de las historias con restricciones del problema CSP.
- Épicas coherentes.
- Releases definidos.
- Sprints con objetivos claros.
- Cronograma con dependencias.
- Ruta crítica.

### Tareas para el agente IA

El agente debe ayudar a crear o mejorar:

1. Un backlog del producto con historias de usuario.
2. Una tabla de priorización.
3. Una tabla que relacione historias con restricciones duras y blandas.
4. Una estructura de épicas.
5. Una planificación por releases.
6. Una planificación por sprints.
7. Un cronograma general.
8. Una ruta crítica simplificada.

### Formato recomendado para historias de usuario

```md
Como [tipo de usuario],
quiero [funcionalidad],
para [beneficio o propósito].
```

### Criterios de aceptación

Cada historia debe incluir criterios de aceptación claros:

```md
Dado que [contexto],
cuando [acción],
entonces [resultado esperado].
```

### Tabla sugerida para backlog

| ID | Épica | Historia de usuario | Prioridad | Valor | Riesgo | Complejidad | Restricción CSP relacionada | Sprint |
|---|---|---|---|---:|---:|---:|---|---|
| HU-001 | Gestión de datos académicos | Como coordinador, quiero registrar docentes, cursos y aulas para alimentar el solver. | Alta | 5 | 4 | 3 | Datos de entrada obligatorios | Sprint 1 |

### Nivel mínimo aceptable

Para cumplir en nivel suficiente:

- Backlog ordenado.
- Historias claras.
- Prioridades justificadas.
- Sprints definidos.
- Releases básicos.
- Relación visible con restricciones del problema.

No es necesario hacer una planificación extremadamente extensa.

---

## 3.2. Métricas ágiles

### Lo que pide la rúbrica

Se deben incluir y analizar:

- Burnup.
- Burndown.
- Velocidad.
- Gráfico de control.
- Evolución del proyecto.
- Cuellos de botella.
- Estabilidad del equipo.
- Coherencia entre planificación y complejidad del problema.

### Tareas para el agente IA

El agente debe ayudar a preparar:

1. Tabla de trabajo planificado vs. completado por sprint.
2. Análisis del burndown.
3. Análisis del burnup.
4. Análisis de velocidad.
5. Análisis del gráfico de control.
6. Identificación de cuellos de botella.
7. Conclusión sobre estabilidad del equipo.

### Tabla sugerida

| Sprint | Historias planificadas | Historias completadas | Story points planificados | Story points completados | Incidencias | Observación |
|---|---:|---:|---:|---:|---:|---|
| Sprint 1 | 8 | 6 | 24 | 18 | 3 | Se retrasó la carga de datos base |
| Sprint 2 | 7 | 7 | 21 | 21 | 1 | Velocidad estable |
| Sprint 3 | 9 | 6 | 27 | 18 | 4 | Complejidad del solver generó retrasos |

### Análisis mínimo esperado

El agente debe redactar análisis breves como:

- La velocidad del equipo fue variable debido a la complejidad del modelado CSP.
- Los mayores cuellos de botella estuvieron en la validación de restricciones y en la integración con la base de datos.
- La planificación se ajustó progresivamente conforme se identificaron casos límite.
- La evolución del proyecto evidencia aprendizaje y refinamiento incremental.

---

## 3.3. Presupuesto del proyecto

### Lo que pide la rúbrica

Debe presentarse un análisis económico integral del sistema.

Debe incluir:

- Recursos humanos.
- Roles.
- Horas estimadas.
- Infraestructura tecnológica.
- Costos indirectos.
- Costos por sprint.
- Costo acumulado.
- Relación entre complejidad del problema y costo.
- Factores que incrementan costos.
- Evaluación de sostenibilidad mediante Green Software.

### Tareas para el agente IA

El agente debe generar:

1. Tabla de roles y horas.
2. Tabla de costos por sprint.
3. Tabla de infraestructura.
4. Tabla de costos indirectos.
5. Costo acumulado.
6. Análisis breve de sostenibilidad.
7. Relación entre costos y complejidad CSP.

### Tabla de recursos humanos

| Rol | Responsabilidad | Horas estimadas | Costo por hora | Costo total |
|---|---|---:|---:|---:|
| Analista funcional | Levantamiento de requisitos y restricciones | 40 | S/ 20 | S/ 800 |
| Backend developer | APIs, base de datos e integración | 80 | S/ 25 | S/ 2000 |
| Frontend developer | Interfaces de gestión y visualización | 70 | S/ 22 | S/ 1540 |
| Solver engineer | Modelado CSP y algoritmo de asignación | 90 | S/ 30 | S/ 2700 |
| QA/Test | Pruebas funcionales y validación | 40 | S/ 18 | S/ 720 |

### Tabla de costos por sprint

| Sprint | Actividades principales | Costo RRHH | Costo infraestructura | Costo indirecto | Total sprint | Acumulado |
|---|---|---:|---:|---:|---:|---:|
| Sprint 1 | Análisis, datos base y planificación | S/ 1200 | S/ 100 | S/ 50 | S/ 1350 | S/ 1350 |
| Sprint 2 | Backend y modelo inicial | S/ 1800 | S/ 120 | S/ 60 | S/ 1980 | S/ 3330 |
| Sprint 3 | Solver CSP y validaciones | S/ 2200 | S/ 150 | S/ 70 | S/ 2420 | S/ 5750 |
| Sprint 4 | Frontend, pruebas e integración | S/ 2000 | S/ 150 | S/ 70 | S/ 2220 | S/ 7970 |

### Análisis mínimo esperado

El agente debe explicar:

- El costo aumenta en las etapas donde se modelan y prueban restricciones complejas.
- La integración del solver con datos reales incrementa el esfuerzo técnico.
- La sostenibilidad puede mejorarse optimizando consultas, reduciendo ejecuciones innecesarias del solver y usando infraestructura ajustada a la demanda.

---

## 3.4. Gestión de riesgos y oportunidades

### Lo que pide la rúbrica

Se debe anticipar escenarios críticos mediante:

- Registro de riesgos.
- Descripción del riesgo.
- Probabilidad.
- Impacto.
- Estrategia de mitigación.
- Registro de oportunidades.
- Impacto positivo esperado.
- Estrategia de aprovechamiento.
- Relación con restricciones CSP, limitaciones técnicas y dependencias externas.

### Tareas para el agente IA

El agente debe construir:

1. Matriz de riesgos.
2. Matriz de oportunidades.
3. Priorización por probabilidad e impacto.
4. Estrategias de mitigación.
5. Relación con componentes técnicos del sistema.

### Tabla de riesgos

| ID | Riesgo | Causa | Probabilidad | Impacto | Nivel | Restricción o dependencia relacionada | Mitigación |
|---|---|---|---:|---:|---:|---|---|
| R-001 | Solapamiento de horarios | Reglas incompletas en el solver | 4 | 5 | 20 | Restricción dura de no cruce docente/aula | Definir pruebas automatizadas para detectar cruces |
| R-002 | Datos incompletos de docentes | Falta de disponibilidad real | 3 | 5 | 15 | Disponibilidad docente | Validar datos antes de ejecutar el solver |
| R-003 | Bajo rendimiento del solver | Muchas combinaciones posibles | 4 | 4 | 16 | Optimización combinatoria | Limitar dominio de búsqueda y priorizar restricciones duras |

### Tabla de oportunidades

| ID | Oportunidad | Impacto positivo | Estrategia de aprovechamiento |
|---|---|---|---|
| O-001 | Automatizar la generación de horarios | Reduce tiempo operativo | Diseñar un solver reutilizable y configurable |
| O-002 | Mejorar uso de aulas | Aumenta eficiencia institucional | Incorporar métricas de ocupación |
| O-003 | Reducir conflictos académicos | Mejora satisfacción de docentes y estudiantes | Validar preferencias y restricciones antes de generar horarios |

### Análisis mínimo esperado

El agente debe redactar que los principales riesgos se concentran en:

- Calidad de datos.
- Complejidad del modelo CSP.
- Validación de restricciones duras.
- Rendimiento del solver.
- Integración entre backend, base de datos y algoritmo.

---

## 3.5. Spec-Driven Development

### Lo que pide la rúbrica

Se evaluará la formalización del sistema antes de su implementación.

Debe incluir:

- `Agents.md` o `constitution.md`.
- Principios del sistema.
- Reglas globales.
- Restricciones duras y blandas.
- `Spec.md`.
- Entradas.
- Salidas.
- Reglas de negocio.
- Casos límite.
- Coherencia entre especificación, modelado e implementación.
- Reducción de ambigüedad.
- Anticipación de conflictos.

### Tareas para el agente IA

El agente debe crear o mejorar:

1. `docs/05-spec.md`.
2. `docs/06-constitution.md`.
3. Lista de entradas del sistema.
4. Lista de salidas del sistema.
5. Restricciones duras.
6. Restricciones blandas.
7. Reglas de negocio.
8. Casos límite.
9. Criterios de validación.
10. Trazabilidad entre restricciones y pruebas.

---

## 3.6. Estructura sugerida para `Spec.md`

```md
# Spec.md — Sistema de Generación Óptima de Horarios Académicos

## 1. Propósito
Definir formalmente las entradas, salidas, reglas, restricciones y casos límite del sistema de generación de horarios académicos.

## 2. Alcance
El sistema permite generar horarios académicos considerando cursos, docentes, aulas, turnos, disponibilidad, capacidad, restricciones duras y preferencias institucionales.

## 3. Entradas
- Cursos.
- Componentes horarios.
- Docentes.
- Disponibilidad docente.
- Aulas.
- Capacidad de aulas.
- Turnos.
- Bloques horarios.
- Restricciones institucionales.
- Preferencias de docentes o coordinación.

## 4. Salidas
- Horario académico generado.
- Asignación curso-docente-aula-bloque.
- Reporte de conflictos.
- Lista de bloques no asignados.
- Métricas de calidad del horario.
- Advertencias y penalizaciones.

## 5. Restricciones duras
- Un docente no puede dictar dos clases al mismo tiempo.
- Un aula no puede tener dos clases en el mismo bloque.
- La capacidad del aula debe cubrir la cantidad de estudiantes.
- Una clase debe asignarse dentro de la disponibilidad del docente.
- Los cursos nocturnos deben asignarse en bloques nocturnos cuando corresponda.
- No se deben generar solapamientos entre componentes incompatibles.

## 6. Restricciones blandas
- Preferir horarios dentro del turno ideal.
- Reducir uso de fines de semana salvo necesidad.
- Maximizar ocupación eficiente de aulas.
- Minimizar bloques dispersos.
- Respetar preferencias de docentes cuando sea posible.
- Reducir cambios manuales posteriores.

## 7. Reglas de negocio
- El sistema prioriza restricciones duras sobre preferencias.
- Si no existe solución completa, debe generar la mejor solución parcial posible.
- Los conflictos deben reportarse claramente.
- Toda asignación debe ser trazable a datos de entrada.
- El sistema debe permitir revisar, corregir y volver a ejecutar el solver.

## 8. Casos límite
- Docente sin disponibilidad registrada.
- Aula insuficiente para la demanda.
- Curso sin docente asignado.
- Demasiadas clases para pocos bloques horarios.
- Docente disponible solo en horario nocturno.
- Curso con práctica y teoría que requieren reglas distintas.
- Saturación de aulas en días laborables.
- Necesidad de usar sábado o domingo por restricciones reales.

## 9. Métricas de calidad
- Tasa de asignación.
- Cantidad de conflictos.
- Ocupación de aulas.
- Cumplimiento de disponibilidad docente.
- Cumplimiento de turno.
- Uso de horarios nocturnos.
- Uso de fines de semana.
- Penalización total.
- Score global del horario.

## 10. Criterios de aceptación
- El sistema no debe generar cruces de docentes.
- El sistema no debe generar cruces de aulas.
- El sistema debe reportar conflictos no resueltos.
- El sistema debe generar métricas de calidad.
- El sistema debe permitir auditar cada asignación.
```

---

## 3.7. Estructura sugerida para `constitution.md`

```md
# Constitution.md — Principios del Sistema

## 1. Principios generales

### 1.1. Prioridad de restricciones duras
Las restricciones duras no deben violarse. Si el sistema no encuentra una solución completa, debe reportar los conflictos en lugar de generar un horario inválido.

### 1.2. Transparencia
Toda decisión del solver debe ser explicable mediante datos de entrada, reglas aplicadas y penalizaciones.

### 1.3. Trazabilidad
Cada funcionalidad debe estar relacionada con una historia de usuario, un commit, un pull request y una evidencia de implementación.

### 1.4. Iteración incremental
El sistema debe desarrollarse por incrementos verificables, evitando cambios grandes sin revisión.

### 1.5. Calidad y validación
Toda regla crítica debe tener pruebas o evidencia de validación.

## 2. Reglas globales

- No se permite asignar dos clases al mismo docente en el mismo bloque.
- No se permite asignar dos clases al mismo aula en el mismo bloque.
- No se deben ignorar disponibilidades docentes.
- No se deben ocultar conflictos.
- No se debe modificar la lógica del solver sin actualizar la especificación.
- No se debe cerrar una historia sin evidencia de implementación.

## 3. Estándares de desarrollo

- Usar commits semánticos.
- Crear ramas por feature.
- Registrar pull requests.
- Mantener README actualizado.
- Relacionar cambios con historias de Jira.
- Documentar decisiones técnicas relevantes.
```

---

## 3.8. Gestión del repositorio en GitHub

### Lo que pide la rúbrica

El repositorio debe evidenciar un proceso de desarrollo profesional.

Debe incluir:

- Estrategia de ramas.
- Git Flow o flujo equivalente.
- Commits semánticos.
- Pull Requests con revisión.
- Desarrollo incremental.
- README completo.
- Evidencia de integración de funcionalidades.
- Evidencia de evolución del sistema.

### Tareas para el agente IA

El agente debe revisar o generar:

1. Estrategia de ramas.
2. Convención de commits.
3. Plantilla de Pull Request.
4. README completo.
5. Registro de funcionalidades.
6. Evidencia de evolución.
7. Relación entre commits y backlog.

### Estrategia de ramas sugerida

```text
main        -> versión estable
develop     -> integración general
feature/*   -> nuevas funcionalidades
fix/*       -> correcciones
docs/*      -> documentación
release/*   -> preparación de entrega
```

### Convención de commits

```text
feat: agregar generación inicial de horarios
fix: corregir validación de solapamiento docente
docs: actualizar especificación de restricciones duras
test: agregar pruebas para cruce de aulas
refactor: mejorar estructura del solver
chore: actualizar configuración del proyecto
```

### Plantilla de Pull Request

```md
# Pull Request

## Descripción
Explicar brevemente qué se implementó o modificó.

## Historia relacionada
- Jira: HU-XXX

## Tipo de cambio
- [ ] Nueva funcionalidad
- [ ] Corrección
- [ ] Documentación
- [ ] Refactorización
- [ ] Pruebas

## Evidencia
- Capturas:
- Logs:
- Tests:
- Enlace a funcionalidad:

## Checklist
- [ ] El cambio está relacionado con una historia de usuario.
- [ ] Se actualizaron documentos si corresponde.
- [ ] No rompe restricciones duras.
- [ ] Se revisó el código.
- [ ] Se probó localmente.
```

---

## 3.9. Trazabilidad del desarrollo

### Lo que pide la rúbrica

Debe existir relación entre:

- Backlog de Jira.
- Commits.
- Pull Requests.
- Funcionalidades implementadas.
- Evidencia de trabajo colaborativo.

### Tareas para el agente IA

El agente debe generar una matriz de trazabilidad.

### Tabla sugerida

| Historia Jira | Funcionalidad | Rama | Commit/PR | Evidencia | Estado |
|---|---|---|---|---|---|
| HU-001 | Registro de docentes | feature/docentes | PR #1 | Captura formulario docentes | Completado |
| HU-002 | Registro de aulas | feature/aulas | PR #2 | Captura tabla aulas | Completado |
| HU-003 | Validación de cruces | feature/solver-conflicts | PR #5 | Test de solapamiento | Completado |
| HU-004 | Reporte de conflictos | feature/reportes | PR #7 | Reporte generado | En revisión |

### Análisis mínimo esperado

El agente debe explicar:

- Cada historia priorizada tiene evidencia de avance.
- Los commits reflejan desarrollo incremental.
- Los PR permiten demostrar colaboración y revisión.
- La trazabilidad reduce ambigüedad y facilita evaluar el avance real del proyecto.

---

## 3.10. Análisis del problema y toma de decisiones

### Lo que pide la rúbrica

Se debe evidenciar:

- Modelado del problema complejo.
- Identificación de trade-offs técnicos.
- Justificación de decisiones.
- Coherencia entre problema, solución e implementación.

### Tareas para el agente IA

El agente debe ayudar a redactar un documento de decisiones técnicas.

### Tabla de decisiones técnicas

| ID | Decisión | Alternativas evaluadas | Criterio de decisión | Trade-off | Justificación |
|---|---|---|---|---|---|
| DT-001 | Usar enfoque CSP/optimización | Algoritmo greedy, asignación manual, heurística simple | Necesidad de manejar restricciones duras y blandas | Mayor complejidad técnica | Permite modelar conflictos de forma formal |
| DT-002 | Separar solver del backend | Solver dentro del backend, microservicio independiente | Modularidad y mantenibilidad | Mayor esfuerzo de integración | Facilita pruebas y evolución del algoritmo |
| DT-003 | Usar PostgreSQL como fuente de verdad | Archivos CSV, memoria, SQLite | Persistencia y trazabilidad | Requiere diseño de esquema | Permite auditoría y reportes |
| DT-004 | Priorizar restricciones duras | Mezclar restricciones con preferencias | Validez del horario | Algunas preferencias pueden incumplirse | Evita horarios inválidos |

### Análisis mínimo esperado

El agente debe explicar que el sistema de horarios es complejo porque combina:

- Docentes.
- Cursos.
- Aulas.
- Bloques horarios.
- Turnos.
- Capacidad.
- Disponibilidad.
- Preferencias.
- Reglas institucionales.
- Conflictos entre recursos.

---

## 3.11. Calidad global de los artefactos

### Lo que pide la rúbrica

Los artefactos deben tener:

- Coherencia.
- Claridad.
- Integración entre planificación, costos, riesgos, SDD y repositorio.
- Consistencia global.

### Tareas para el agente IA

El agente debe revisar que:

1. Los nombres de historias sean consistentes.
2. Los IDs de Jira coincidan con commits y PR.
3. Las restricciones del Spec.md aparezcan en riesgos, pruebas y backlog.
4. El README explique correctamente el sistema.
5. Los documentos no se contradigan.
6. Las decisiones técnicas estén justificadas.
7. Los costos estén relacionados con el alcance.
8. Los riesgos estén relacionados con restricciones reales.

### Checklist final

```md
# Checklist de entrega

## Planificación
- [ ] Backlog completo.
- [ ] Historias de usuario claras.
- [ ] Épicas definidas.
- [ ] Sprints definidos.
- [ ] Releases definidos.
- [ ] Cronograma incluido.
- [ ] Ruta crítica incluida.

## Métricas ágiles
- [ ] Burnup incluido.
- [ ] Burndown incluido.
- [ ] Velocidad incluida.
- [ ] Gráfico de control incluido.
- [ ] Análisis de evolución incluido.
- [ ] Cuellos de botella identificados.

## Presupuesto
- [ ] Costos de RRHH incluidos.
- [ ] Costos de infraestructura incluidos.
- [ ] Costos indirectos incluidos.
- [ ] Costos por sprint incluidos.
- [ ] Costo acumulado incluido.
- [ ] Análisis Green Software incluido.

## Riesgos y oportunidades
- [ ] Registro de riesgos incluido.
- [ ] Probabilidad e impacto incluidos.
- [ ] Mitigación incluida.
- [ ] Registro de oportunidades incluido.
- [ ] Relación con CSP incluida.

## SDD
- [ ] Spec.md incluido.
- [ ] Constitution.md o Agents.md incluido.
- [ ] Entradas definidas.
- [ ] Salidas definidas.
- [ ] Reglas de negocio definidas.
- [ ] Restricciones duras definidas.
- [ ] Restricciones blandas definidas.
- [ ] Casos límite definidos.

## GitHub
- [ ] Estrategia de ramas incluida.
- [ ] Commits semánticos usados.
- [ ] Pull Requests registrados.
- [ ] README completo.
- [ ] Evidencia de desarrollo incremental.

## Trazabilidad
- [ ] Backlog relacionado con commits.
- [ ] Commits relacionados con PR.
- [ ] PR relacionados con funcionalidades.
- [ ] Evidencia de colaboración incluida.

## Calidad global
- [ ] Documentos claros.
- [ ] Documentos coherentes.
- [ ] No hay contradicciones.
- [ ] Se evidencia toma de decisiones.
- [ ] Se evidencia relación entre problema y solución.
```

---

# 4. Nivel objetivo recomendado

El agente IA debe apuntar primero a un nivel **Suficiente (2)** sólido y luego mejorar hacia **Sobresaliente (3)** si hay tiempo.

## Nivel suficiente

Para nivel suficiente, basta con:

- Entregables completos.
- Análisis básico pero coherente.
- Tablas claras.
- Evidencia mínima.
- Trazabilidad general.
- Sin contradicciones graves.

## Nivel sobresaliente

Para nivel sobresaliente, se debe mejorar con:

- Mayor profundidad analítica.
- Evidencia cuantitativa.
- Métricas interpretadas con más detalle.
- Validación de ruta crítica.
- Riesgos mejor priorizados.
- Trade-offs técnicos más claros.
- Trazabilidad más completa.
- Pull requests revisados.
- Documentación más profesional.

---

# 5. Instrucciones de estilo para el agente IA

El agente debe seguir estas reglas:

1. No escribir teoría innecesaria.
2. Priorizar tablas, listas y evidencias.
3. Redactar de forma académica, pero directa.
4. Mantener coherencia con el proyecto de horarios académicos.
5. Usar términos técnicos solo cuando aporten valor.
6. Relacionar siempre la documentación con el sistema real.
7. No inventar evidencias que no existan.
8. Cuando falte evidencia, marcarla como pendiente.
9. Usar IDs consistentes: HU-001, R-001, DT-001, etc.
10. Mantener trazabilidad entre Jira, GitHub, Spec y funcionalidades.

---

# 6. Prompt base para usar con un agente IA

```text
Actúa como un asistente técnico-académico para el curso Taller de Proyectos 2.

Debes ayudarme a preparar los artefactos exigidos por la rúbrica del proyecto:
- Planificación en Jira.
- Métricas ágiles.
- Presupuesto.
- Gestión de riesgos y oportunidades.
- Spec-Driven Development.
- Gestión del repositorio GitHub.
- Trazabilidad del desarrollo.
- Análisis de decisiones técnicas.
- Calidad global de artefactos.

El proyecto es un Sistema de Generación Óptima de Horarios Académicos en Entornos de Currículo Flexible, basado en restricciones tipo CSP/optimización combinatoria.

No quiero teoría extensa. Quiero documentos en Markdown, claros, prácticos, con tablas, listas, criterios de aceptación, matrices y evidencias.

Trabaja apuntando primero a nivel Suficiente (2) de la rúbrica, y luego mejora hacia Sobresaliente (3) si hay tiempo.

Mantén trazabilidad entre:
- Historias de usuario.
- Restricciones del problema.
- Sprints.
- Commits.
- Pull Requests.
- Funcionalidades.
- Evidencias.

No inventes datos. Si falta información, usa el estado “Pendiente” o “Por validar”.
```

---

# 7. Prompts específicos para generar cada archivo

## 7.1. Prompt para `01-planificacion-jira.md`

```text
Genera el archivo docs/01-planificacion-jira.md para mi proyecto de generación óptima de horarios académicos.

Debe incluir:
- Épicas.
- Backlog con historias de usuario.
- Priorización por valor, riesgo y complejidad.
- Relación con restricciones CSP.
- Sprints.
- Releases.
- Cronograma.
- Dependencias.
- Ruta crítica simplificada.

Usa tablas en Markdown. No escribas teoría extensa.
```

## 7.2. Prompt para `02-metricas-agiles.md`

```text
Genera el archivo docs/02-metricas-agiles.md.

Debe incluir:
- Burnup.
- Burndown.
- Velocidad.
- Gráfico de control.
- Tabla de avance por sprint.
- Análisis de evolución del proyecto.
- Cuellos de botella.
- Estabilidad del equipo.
- Conclusión.

Usa datos de ejemplo si todavía no tengo métricas reales, pero márcalos como “estimados” o “por validar”.
```

## 7.3. Prompt para `03-presupuesto.md`

```text
Genera el archivo docs/03-presupuesto.md.

Debe incluir:
- Costos de recursos humanos.
- Roles.
- Horas estimadas.
- Infraestructura tecnológica.
- Costos indirectos.
- Costos por sprint.
- Costo acumulado.
- Relación entre complejidad CSP y costo.
- Factores que incrementan costos.
- Evaluación breve de Green Software.

Usa soles peruanos. Si faltan datos, marca como “estimado”.
```

## 7.4. Prompt para `04-riesgos-oportunidades.md`

```text
Genera el archivo docs/04-riesgos-oportunidades.md.

Debe incluir:
- Registro de riesgos.
- Probabilidad.
- Impacto.
- Nivel de riesgo.
- Estrategia de mitigación.
- Registro de oportunidades.
- Estrategia de aprovechamiento.
- Relación con restricciones CSP, limitaciones técnicas y dependencias externas.

Usa tablas claras en Markdown.
```

## 7.5. Prompt para `05-spec.md`

```text
Genera el archivo docs/05-spec.md para el sistema de generación de horarios académicos.

Debe incluir:
- Propósito.
- Alcance.
- Entradas.
- Salidas.
- Reglas de negocio.
- Restricciones duras.
- Restricciones blandas.
- Casos límite.
- Métricas de calidad.
- Criterios de aceptación.
- Validaciones esperadas.

Debe reducir ambigüedad y anticipar conflictos como solapamientos de docentes, aulas y turnos.
```

## 7.6. Prompt para `06-constitution.md`

```text
Genera el archivo docs/06-constitution.md o AGENTS.md.

Debe incluir:
- Principios del sistema.
- Reglas globales.
- Restricciones duras y blandas.
- Estándares de desarrollo.
- Reglas para modificar el solver.
- Reglas para actualizar documentación.
- Reglas para trazabilidad entre Jira, commits y PR.

Debe servir como guía para agentes IA y desarrolladores.
```

## 7.7. Prompt para `07-trazabilidad.md`

```text
Genera el archivo docs/07-trazabilidad.md.

Debe incluir:
- Matriz de trazabilidad entre historias Jira, funcionalidades, ramas, commits, PR y evidencias.
- Estado de cada funcionalidad.
- Relación con restricciones CSP.
- Observaciones.
- Checklist de evidencias.

Si faltan commits o PR reales, marcar como “Pendiente”.
```

## 7.8. Prompt para `08-decisiones-tecnicas.md`

```text
Genera el archivo docs/08-decisiones-tecnicas.md.

Debe incluir:
- Decisiones técnicas relevantes.
- Alternativas evaluadas.
- Criterios de decisión.
- Trade-offs.
- Justificación.
- Impacto en el proyecto.

Enfócate en decisiones como:
- Uso de CSP/optimización.
- Separación del solver.
- Uso de PostgreSQL.
- Priorización de restricciones duras.
- Manejo de casos no asignados.
- Uso de pruebas automatizadas.
```

---

# 8. Definición de terminado

Se considera que la documentación está lista cuando:

- Todos los documentos existen.
- Cada documento tiene tablas y análisis mínimo.
- La información está relacionada con el proyecto real.
- Los artefactos no se contradicen.
- Existe trazabilidad entre planificación, desarrollo e implementación.
- El README permite entender e instalar el sistema.
- El Spec.md describe correctamente reglas, entradas, salidas y casos límite.
- La gestión de riesgos contempla datos, solver, rendimiento e integración.
- El repositorio evidencia trabajo incremental.

---

# 9. Resumen ejecutivo para la entrega

El proyecto debe presentarse como una solución de ingeniería para un problema complejo de timetabling académico.  
La documentación debe demostrar que el equipo no solo implementó funcionalidades, sino que planificó, modeló, gestionó riesgos, estimó costos, formalizó especificaciones y mantuvo trazabilidad del desarrollo.

La prioridad es entregar evidencia clara, no teoría extensa.
