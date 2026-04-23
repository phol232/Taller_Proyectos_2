# Diseño del Microservicio Solver CSP

## 1. Objetivo

Definir el modelo de datos y la arquitectura mínima para implementar el motor de horarios requerido por `Requerimientos_Funcionales_y_No_Funcionales.md`, respetando las reglas de `frontend/AGENTS.md`.

El estado actual del repositorio solo cubre autenticación, sesiones y perfil. Para cumplir RF-01 a RF-17, sí es necesario agregar tablas nuevas.

---

## 2. Decisión de arquitectura

### 2.1 Responsabilidades por servicio

**Spring Boot (`backend/horarios_api`)**
- Sigue siendo el sistema de registro para autenticación, usuarios, perfil y CRUD académico.
- Expone los flujos de negocio del sistema principal.
- Mantiene la política actual: DDL manual en `database/` y lógica SQL reusable en PL/pgSQL.

**FastAPI (`solver_api`, pendiente de implementación)**
- Encapsula la generación de horarios docente y estudiante.
- Ejecuta validaciones CSP y devuelve conflictos explicables.
- Persiste artefactos propios del solver (`solver_runs`, conflictos, resultados de generación).
- No debe duplicar autenticación ni lógica ya resuelta por el backend Java.

### 2.2 Persistencia

Para el PMV conviene usar **el mismo PostgreSQL** con separación lógica por bounded context:
- tablas transaccionales académicas compartidas por el sistema;
- tablas operativas del solver para corridas, conflictos y auditoría.

El microservicio FastAPI debe usar **SQLAlchemy Core o `psycopg`**, no ORM rico, para mantenerse alineado con la regla del proyecto de no esconder el acceso a datos detrás de mapeos automáticos.

### 2.3 Estrategia de integración

- El backend Java sigue siendo la puerta principal para usuarios y CRUD.
- El solver FastAPI trabaja sobre snapshots consistentes del período.
- La generación docente conviene ejecutarla como **job asíncrono**:
  - `POST /api/v1/teacher-schedules/generate`
  - respuesta `202 Accepted` con `run_id`
  - `GET /api/v1/solver-runs/{run_id}` para consultar estado
- La generación de propuesta para estudiante puede ser síncrona mientras siga cumpliendo el límite de 5 segundos.

---

## 3. Tablas que ya existen y se reutilizan

Estas tablas ya están en `database/schema.sql` y no deben duplicarse:

- `users`
- `profiles`
- `refresh_tokens`
- `password_reset_tokens`
- `oauth2_linked_accounts`

`users` ya resuelve identidad, email, rol y estado activo. Las entidades académicas deben colgarse de esa identidad cuando aplique.

---

## 4. Tablas nuevas obligatorias

## 4.1 Núcleo académico

| Tabla | Propósito | Columnas clave / reglas |
|---|---|---|
| `academic_periods` | Períodos académicos sobre los que se genera el horario. | `id`, `code`, `name`, `starts_at`, `ends_at`, `status`, `max_student_credits`; `code` único. |
| `time_slots` | Bloques horarios fijos reutilizables por el solver. | `id`, `day_of_week`, `start_time`, `end_time`, `slot_order`, `is_active`; `UNIQUE(day_of_week, start_time, end_time)`. |
| `teachers` | Datos académicos del docente. | `id`, `user_id`, `code`, `specialty`, `is_active`; `user_id` único, `code` único. |
| `teacher_availability` | Disponibilidad semanal del docente por bloque. | `teacher_id`, `time_slot_id`, `is_available`; `UNIQUE(teacher_id, time_slot_id)`. |
| `students` | Datos académicos del estudiante. | `id`, `user_id`, `code`, `cycle`, `career`, `credit_limit`, `is_active`; `user_id` único, `code` único. |
| `student_completed_courses` | Cursos aprobados del estudiante. | `student_id`, `course_id`, `approved_at`; `UNIQUE(student_id, course_id)`. |
| `classrooms` | Aulas físicas. | `id`, `code`, `name`, `capacity`, `room_type`, `is_active`; `code` único. |
| `classroom_availability` | Disponibilidad del aula por bloque. | `classroom_id`, `time_slot_id`, `is_available`; `UNIQUE(classroom_id, time_slot_id)`. |
| `courses` | Catálogo base de cursos. | `id`, `code`, `name`, `credits`, `weekly_hours`, `required_room_type`, `is_active`; `code` único. |
| `course_prerequisites` | Relación N:M de prerrequisitos. | `course_id`, `prerequisite_course_id`; `UNIQUE(course_id, prerequisite_course_id)`. |
| `course_offerings` | Oferta de un curso en un período. | `id`, `academic_period_id`, `course_id`, `expected_enrollment`, `status`; `UNIQUE(academic_period_id, course_id)`. |
| `course_sections` | Secciones concretas de una oferta. | `id`, `course_offering_id`, `section_code`, `vacancy_limit`, `status`; `UNIQUE(course_offering_id, section_code)`. |
| `section_teacher_candidates` | Docentes que sí pueden dictar una sección. | `section_id`, `teacher_id`, `priority_weight`; `UNIQUE(section_id, teacher_id)`. |

## 4.2 Horario docente

| Tabla | Propósito | Columnas clave / reglas |
|---|---|---|
| `teaching_schedules` | Cabecera del horario docente de un período. | `id`, `academic_period_id`, `version`, `status`, `created_by`, `confirmed_by`, `created_at`, `confirmed_at`; permitir una sola versión `CONFIRMED` activa por período. |
| `section_assignments` | Asignación de una sección dentro de un horario. | `id`, `teaching_schedule_id`, `section_id`, `teacher_id`, `classroom_id`, `assignment_status`; `UNIQUE(teaching_schedule_id, section_id)`. |
| `section_assignment_slots` | Bloques horarios concretos de cada asignación. | `id`, `section_assignment_id`, `teaching_schedule_id`, `section_id`, `teacher_id`, `classroom_id`, `time_slot_id`; índices/constraints para evitar conflictos. |

**Constraints recomendados en `section_assignment_slots`:**
- `UNIQUE(teaching_schedule_id, teacher_id, time_slot_id)`
- `UNIQUE(teaching_schedule_id, classroom_id, time_slot_id)`
- índice por `section_id`
- índice por `time_slot_id`

Con esto el borrador ya funciona como reserva transaccional de recursos y cubre RF-08, RF-09, RF-10 y RF-11.

## 4.3 Horario del estudiante

| Tabla | Propósito | Columnas clave / reglas |
|---|---|---|
| `student_schedules` | Cabecera del horario del estudiante por período. | `id`, `student_id`, `academic_period_id`, `status`, `generated_by`, `created_at`, `confirmed_at`; `UNIQUE(student_id, academic_period_id, status)` parcial según estado activo. |
| `student_schedule_items` | Secciones elegidas por el estudiante. | `id`, `student_schedule_id`, `student_id`, `section_id`, `course_id`, `item_status`; `UNIQUE(student_schedule_id, section_id)` y `UNIQUE(student_schedule_id, course_id)`. |

La vacante disponible de una sección se calcula con:
- `course_sections.vacancy_limit`
- menos el conteo de `student_schedule_items` activos/confirmados para esa sección.

---

## 5. Tablas nuevas recomendadas para el microservicio solver

| Tabla | Propósito | Columnas clave / reglas |
|---|---|---|
| `solver_runs` | Auditoría y seguimiento de cada corrida. | `id`, `run_type` (`TEACHER`/`STUDENT`), `academic_period_id`, `student_id` nullable, `status`, `requested_by`, `started_at`, `finished_at`, `time_limit_ms`, `input_hash`, `result_summary`. |
| `solver_run_conflicts` | Conflictos explicables cuando no hay solución o cuando una validación falla. | `id`, `solver_run_id`, `conflict_type`, `resource_type`, `resource_id`, `section_id`, `time_slot_id`, `message`, `details_json`. |

Estas dos tablas no son opcionales si quieren:
- polling de jobs;
- trazabilidad;
- explicación de conflictos para RF-15;
- evidencia para depurar si una corrida supera el tiempo objetivo.

---

## 6. Tablas que no conviene modelar como JSON

No almacenar como arrays o JSON en una sola columna:

- cursos aprobados del estudiante;
- prerrequisitos;
- disponibilidad docente;
- disponibilidad de aula;
- franjas asignadas a secciones.

Eso rompería validaciones, índices y control de concurrencia. Todas esas relaciones deben ser normalizadas.

---

## 7. Algoritmo recomendado

## 7.1 Generación de horario docente

### Variables

Cada variable del CSP es una `course_section` del período.

### Dominio de cada variable

Cada sección tiene como dominio las combinaciones factibles de:
- docente candidato;
- aula compatible;
- conjunto de `time_slots` necesarios para cubrir `weekly_hours`.

Antes de iniciar la búsqueda, el dominio se poda con restricciones locales:
- docente permitido para la sección;
- disponibilidad completa del docente;
- disponibilidad completa del aula;
- capacidad del aula mayor o igual a la matrícula esperada;
- compatibilidad `required_room_type` del curso vs `room_type` del aula.

### Hard constraints

- un docente no puede ocupar dos bloques superpuestos;
- un aula no puede ocupar dos bloques superpuestos;
- la sección debe cubrir exactamente sus horas semanales;
- la disponibilidad docente y del aula debe respetarse al 100%;
- la capacidad del aula no puede quedar por debajo de la vacante esperada.

### Soft constraints del PMV

Solo después de encontrar factibilidad:
- distribuir carga semanal del docente;
- evitar concentrar toda la carga de una sección en un mismo día;
- priorizar candidatos con `priority_weight` mayor.

### Heurísticas

Orden recomendado:
1. **MRV**: elegir primero la sección con menos valores posibles.
2. **Degree heuristic**: en empate, elegir la que colisiona con más otras secciones.
3. **LCV**: probar primero el valor que menos reduce dominios ajenos.
4. **Forward checking** tras cada asignación.
5. **AC-3 opcional** al construir dominios iniciales o tras grandes podas.

### Estrategia de búsqueda

- Backtracking con deadline duro (`<= 30s`).
- Guardar la mejor solución factible encontrada hasta el momento.
- Si no existe solución, devolver los conflictos más frecuentes detectados durante la poda.

## 7.2 Generación de horario del estudiante

La generación del estudiante debe correr **después** de existir un horario docente confirmado del período.

### Variables

Cada variable es un curso seleccionado por el estudiante.

### Dominio

Las secciones confirmadas disponibles para ese curso.

### Filtros previos

Antes de buscar:
- eliminar cursos sin prerrequisitos cumplidos;
- eliminar secciones sin vacantes;
- calcular crédito máximo permitido del estudiante.

### Hard constraints

- no exceder `credit_limit`;
- no elegir dos secciones solapadas;
- no elegir secciones sin vacante;
- no elegir cursos con prerrequisitos faltantes.

### Estrategia

- ordenar cursos por menor número de secciones disponibles;
- backtracking + forward checking;
- detenerse en la primera solución válida o hasta `<= 5s`;
- si no hay solución, devolver conflictos detallados por curso, sección o crédito.

---

## 8. Flujo transaccional recomendado

## 8.1 Horario docente

1. El coordinador solicita generación.
2. Se crea `solver_runs(status='PENDING')`.
3. El solver toma snapshot del período.
4. Genera una propuesta.
5. Si hay solución:
   - crea `teaching_schedules(status='DRAFT')`;
   - inserta `section_assignments`;
   - inserta `section_assignment_slots`;
   - marca `solver_runs(status='SUCCEEDED')`.
6. Si no hay solución:
   - inserta `solver_run_conflicts`;
   - marca `solver_runs(status='FAILED')`.
7. La confirmación final del horario cambia `teaching_schedules.status` a `CONFIRMED`.

## 8.2 Horario del estudiante

1. El estudiante selecciona cursos.
2. El solver valida prerrequisitos, créditos, vacantes y solapamientos.
3. Si hay propuesta válida:
   - crea/actualiza `student_schedules(status='DRAFT')`;
   - inserta `student_schedule_items`.
4. Al confirmar:
   - cambia el estado a `CONFIRMED`.

---

## 9. Estructura sugerida del microservicio FastAPI

```text
solver_api/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── teacher_schedule.py
│   │   │   ├── student_schedule.py
│   │   │   └── solver_runs.py
│   ├── application/
│   │   ├── use_cases/
│   │   │   ├── generate_teacher_schedule.py
│   │   │   ├── validate_teacher_schedule.py
│   │   │   ├── generate_student_schedule.py
│   │   │   └── validate_student_schedule.py
│   ├── domain/
│   │   ├── models/
│   │   ├── services/
│   │   ├── constraints/
│   │   └── ports/
│   └── infrastructure/
│       ├── persistence/
│       ├── repositories/
│       └── settings/
├── tests/
│   ├── unit/
│   └── integration/
└── pyproject.toml
```

Regla de dependencias:

`api -> application -> domain`

`infrastructure` implementa repositorios y acceso a PostgreSQL, pero no contiene la lógica del solver.

---

## 10. Capa de Machine Learning complementaria

## 10.1 Principio de diseño

Machine Learning **no reemplaza** al motor CSP. En este proyecto debe actuar como una capa complementaria para:

- priorizar opciones válidas;
- puntuar soluciones factibles;
- sugerir combinaciones con menor riesgo operativo;
- explicar por qué una propuesta probablemente será corregida.

Regla del proyecto:

- **CSP / restricciones hard** decide si un horario es válido.
- **ML** ayuda a decidir qué horario válido parece mejor.

## 10.2 Casos de uso aprobados para ML

Los casos con mejor relación valor/complejidad para el PMV+ son:

| Caso | Tipo de problema | Uso en el sistema |
|---|---|---|
| Sugerir franjas con menos probabilidad de conflicto | Clasificación / score de riesgo | Ordenar dominios antes o durante la búsqueda CSP |
| Aprender preferencias históricas de estudiantes o coordinadores | Ranking / clasificación | Priorizar secciones o combinaciones válidas |
| Detectar patrones de horarios que luego son corregidos manualmente | Clasificación supervisada | Penalizar soluciones que suelen terminar en ajuste manual |

## 10.3 Stack recomendado

| Herramienta | Uso recomendado |
|---|---|
| `pandas` | Construcción de datasets, limpieza y feature engineering |
| `scikit-learn` | Baselines, pipelines, validación, métricas y modelos simples |
| `XGBoost` o `LightGBM` | Modelos de producción para datos tabulares del PMV+ |
| `SHAP` | Explicabilidad de scores y ranking de variables influyentes |

Decisión recomendada:

- **baseline**: `pandas` + `scikit-learn`
- **producción PMV+**: `pandas` + `XGBoost` o `LightGBM`
- **explicabilidad**: `SHAP`

## 10.4 Qué modelo usar en cada caso

### A. Sugerir franjas horarias con menos probabilidad de conflicto

**Problema**
- predecir el riesgo de conflicto de una combinación válida candidata.

**Label sugerido**
- `conflict_risk = 1` si la combinación terminó generando conflicto, rechazo o inviabilidad;
- `conflict_risk = 0` si se sostuvo sin conflicto.

**Baseline**
- `LogisticRegression`
- `RandomForestClassifier`

**Modelo recomendado para PMV+**
- `XGBoost` o `LightGBM`

**Features sugeridas**
- día de la semana
- hora de inicio
- hora de fin
- duración total
- carga acumulada del docente ese día
- carga acumulada del aula ese día
- cantidad de secciones cercanas en franja vecina
- tipo de aula requerida vs tipo de aula real
- matrícula esperada vs capacidad del aula
- número de candidatos restantes para esa sección

### B. Aprender preferencias históricas de estudiantes o coordinadores

**Problema**
- rankear opciones válidas según probabilidad de aceptación o elección.

**Label sugerido**
- `accepted = 1` si la opción fue elegida o mantenida;
- `accepted = 0` si fue descartada o reemplazada.

**Baseline**
- `LogisticRegression`
- `RandomForestClassifier`

**Modelo recomendado para PMV+**
- `XGBoost` o `LightGBM`

**Si el histórico crece mucho**
- pasar a un enfoque de **learning to rank** como `LambdaMART`.

**Features sugeridas**
- día de la semana
- turno mañana/tarde/noche
- cantidad de huecos en el horario
- número de cursos en el mismo día
- si la franja deja bloques consecutivos cómodos o fragmenta la jornada
- historial de aceptación del usuario para esa franja
- historial de aceptación por coordinador para cierto patrón
- balance semanal de carga

### C. Detectar patrones de horarios corregidos manualmente

**Problema**
- predecir si una asignación o propuesta válida será modificada después.

**Label sugerido**
- `manually_corrected = 1` si el coordinador modificó o reemplazó la asignación;
- `manually_corrected = 0` si permaneció igual.

**Baseline**
- `LogisticRegression`

**Modelo recomendado para PMV+**
- `XGBoost` o `LightGBM`

**Features sugeridas**
- densidad de cursos por día
- cantidad de huecos
- carga total por docente
- concentración excesiva en un día
- distancia temporal entre bloques
- aula al límite de capacidad
- franja históricamente poco preferida
- número de conflictos blandos penalizados en la solución

## 10.5 Tabla de datos para ML

Para soportar entrenamiento y trazabilidad, conviene agregar estas tablas cuando se active la capa ML:

| Tabla | Propósito |
|---|---|
| `schedule_feedback_events` | Registrar aceptación, rechazo, reemplazo, corrección manual y confirmación de propuestas |
| `ml_feature_snapshots` | Guardar snapshot de features usadas en entrenamiento o scoring |
| `ml_training_runs` | Auditoría de entrenamientos, versión de dataset, métrica y artefacto generado |
| `ml_model_registry` | Versionado de modelos publicados, tipo de problema, estado y ruta del artefacto |
| `ml_prediction_logs` | Registro de scores emitidos por modelo durante generación o ranking |

### Columnas mínimas sugeridas

**`schedule_feedback_events`**
- `id`
- `event_type`
- `academic_period_id`
- `student_id` nullable
- `teaching_schedule_id` nullable
- `student_schedule_id` nullable
- `section_id` nullable
- `assignment_id` nullable
- `actor_user_id`
- `event_payload_json`
- `created_at`

**`ml_model_registry`**
- `id`
- `model_name`
- `model_type`
- `target_name`
- `library_name`
- `library_version`
- `artifact_path`
- `feature_schema_json`
- `metrics_json`
- `status`
- `created_at`
- `activated_at`

**`ml_prediction_logs`**
- `id`
- `model_id`
- `solver_run_id`
- `prediction_type`
- `entity_type`
- `entity_id`
- `score`
- `explanation_json`
- `created_at`

## 10.6 Flujo recomendado de ML

1. El sistema registra eventos de decisión humana y resultados de scheduling.
2. Un proceso offline arma datasets con `pandas`.
3. Se entrena un baseline en `scikit-learn`.
4. Si el baseline aporta valor, se migra a `XGBoost` o `LightGBM`.
5. El modelo publicado se registra en `ml_model_registry`.
6. Durante la generación, el solver consulta el score del modelo.
7. Ese score se usa como:
   - criterio de orden de dominio;
   - penalización soft;
   - ranking de soluciones factibles.
8. `SHAP` genera explicaciones para auditoría o depuración.

## 10.7 Cómo integrar ML con el CSP

La integración correcta no es “ML genera el horario”, sino:

- el CSP construye valores posibles;
- ML asigna un score a cada valor o a cada solución parcial;
- el solver usa ese score para:
  - ordenar candidatos;
  - romper empates;
  - priorizar soluciones más aceptables.

Ejemplo de score compuesto:

`final_score = hard_validity + ml_preference_score - soft_penalty`

Donde:
- `hard_validity` no es negociable;
- `ml_preference_score` ayuda a ordenar;
- `soft_penalty` castiga patrones indeseables.

## 10.8 Qué no usar al inicio

No se recomienda para el PMV:

- redes neuronales profundas;
- transformers;
- reinforcement learning para construir el horario completo;
- modelos generativos que intenten reemplazar el solver.

Razones:

- el dominio actual es tabular;
- el PMV tendrá pocos datos históricos;
- se necesita explicabilidad;
- el riesgo técnico sube mucho y el valor incremental inicial es bajo.

## 10.9 Recomendación de adopción por fases

### Fase 1
- solo CSP + hard constraints + soft constraints manuales

### Fase 2
- `pandas` + `scikit-learn` para baseline
- medir si mejora ranking, aceptación o reducción de correcciones

### Fase 3
- `XGBoost` o `LightGBM` para producción PMV+
- `SHAP` para explicar scores

### Fase 4
- learning to rank si el histórico crece y hay suficientes decisiones reales

---

## 11. Resumen de decisión

Si se quiere cumplir los RF y lo que hoy dice `AGENTS.md`, la respuesta corta es:

- **sí**, hacen falta tablas nuevas;
- el solver debe ser un **microservicio FastAPI separado**;
- el modelo debe ser **normalizado**, no basado en arrays/JSON;
- la generación docente y del estudiante deben ser **dos casos de uso distintos**;
- el algoritmo recomendado para el PMV es **CSP con backtracking + MRV + LCV + forward checking**, con soporte opcional de AC-3;
- si luego agregan ML, debe ser una **capa de scoring/ranking complementaria** con `scikit-learn` como baseline y `XGBoost`/`LightGBM` para producción;
- la confirmación del horario y la consistencia concurrente deben quedar protegidas por **constraints SQL e índices únicos**, no solo por lógica en aplicación.
