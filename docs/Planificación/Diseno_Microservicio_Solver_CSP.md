# Diseño del Microservicio Solver CSP — Planner UC

## Contexto del Sistema

El microservicio Solver CSP genera horarios académicos institucionales y personales sin solapamientos, respetando disponibilidad de docentes, aulas, vacantes, prerrequisitos, créditos, turno preferido y tiempos de traslado.

PostgreSQL es la fuente de verdad. El backend y el solver no crean esquema desde ORM; toda operación de datos se hace mediante funciones PL/pgSQL o tablas diseñadas en `database/`.

El dominio no usa “secciones” como concepto principal. La unidad académica visible para el estudiante es el **curso**. La unidad que el solver agenda es el **componente horario del curso**.

---

## Modelo Mental Clave

Un curso puede ser general o estar compuesto por teoría/práctica:

```text
courses
  = unidad académica
  = créditos, ciclo, prerrequisitos, corequisitos, cursos aprobados
  └── course_components[]
        = unidad horaria asignable por el solver
        = GENERAL | THEORY | PRACTICE
        = horas semanales + tipo de aula requerido
```

Esto permite casos reales como:

```text
FIS-101 Física I
  credits = 4
  ├── THEORY  2h/sem · Aula regular · Docente A
  └── PRACTICE 2h/sem · Laboratorio · Docente B
```

El estudiante sigue llevando **un solo curso** para créditos y avance académico, pero su horario muestra varios bloques si el curso tiene varios componentes.

---

## Tablas Principales

### Entrada Académica

| Tabla | Uso |
|---|---|
| `courses` | Código, nombre, ciclo, créditos, horas totales, prerrequisitos de créditos |
| `course_components` | Componentes `GENERAL`, `THEORY`, `PRACTICE`; horas y aula requerida por componente |
| `course_prerequisites` | Prerrequisitos por curso |
| `course_corequisites` | Cursos que deben tomarse juntos |
| `teacher_course_components` | Docentes que pueden dictar cada componente |
| `classroom_courses` | Aulas autorizadas para el curso |
| `teachers`, `teacher_availability` | Docentes y disponibilidad |
| `classrooms`, `classroom_availability` | Aulas, capacidad, tipo y disponibilidad |
| `time_slots` | Franjas de tiempo |
| `building_travel_times` | Tiempo de traslado entre edificios |
| `students`, `student_completed_courses`, `profiles` | Datos académicos del estudiante, cursos aprobados y turno |

### Salida Institucional

```text
teaching_schedules
course_schedule_assignments
  = oferta de un componente en un aula/docente
  = (teaching_schedule_id, course_id, course_component_id, teacher_id)
course_assignment_slots
  = slots concretos de esa oferta
  = incluye course_component_id, aula y time_slot
```

### Salida del Estudiante

```text
student_schedules
student_schedule_items
  = una fila por curso asignado al estudiante
  = créditos se cuentan una sola vez
student_schedule_item_components
  = componentes concretos elegidos para ese curso
  = course_component_id + course_assignment_id
```

---

## Reglas de Modelado

1. Un curso activo debe tener al menos un componente activo.
2. Un curso puede tener exactamente un componente `GENERAL`, o componentes específicos `THEORY`/`PRACTICE`.
3. No se mezcla `GENERAL` con `THEORY`/`PRACTICE`.
4. La suma de `course_components.weekly_hours` debe coincidir con `courses.weekly_hours`.
5. `courses.credits`, prerrequisitos, corequisitos y cursos aprobados se evalúan por `course_id`.
6. Docente, aula, tipo de aula y slots se evalúan por `course_component_id`.
7. `teacher_courses` queda como compatibilidad/índice por curso; la fuente precisa para el solver es `teacher_course_components`.

---

## Restricciones Duras — Fase 1

### H1 — Sin solapamiento de docente

Un docente no puede tener dos componentes en el mismo `time_slot_id` dentro del mismo horario institucional.

```sql
UNIQUE(teaching_schedule_id, teacher_id, time_slot_id)
```

### H2 — Sin solapamiento de aula

Un aula no puede alojar dos componentes en el mismo `time_slot_id`.

```sql
UNIQUE(teaching_schedule_id, classroom_id, time_slot_id)
```

### H3 — Disponibilidad del docente

Solo se asignan slots donde el docente esté disponible.

### H4 — Disponibilidad del aula

Solo se asignan slots donde el aula esté disponible.

### H5 — Compatibilidad aula-componente

Para asignar un componente:

```text
classroom_courses(classroom_id, course_id) existe
AND classrooms.room_type = course_components.required_room_type
```

### H6 — Competencia del docente por componente

Para asignar un componente:

```text
teacher_course_components(teacher_id, course_component_id) existe
```

### H7 — Horas exactas por componente

Cada `course_schedule_assignment` debe tener exactamente:

```text
course_components.weekly_hours
```

slots en `course_assignment_slots`.

### H8 — Capacidad suficiente

La capacidad del aula asignada debe cubrir la demanda proyectada de esa oferta.

La demanda se calcula por curso, porque el estudiante que necesita el curso necesita todos sus componentes. Luego se replica por componente para definir cuántas ofertas de cada componente se requieren.

### H9 — Tiempo de traslado del docente

Si un docente tiene slots consecutivos en edificios distintos, el traslado debe ser factible según `building_travel_times`.

---

## Restricciones Duras — Fase 2

### H10 — Prerrequisitos aprobados

Un estudiante solo puede recibir un curso si aprobó todos sus prerrequisitos.

### H11 — Límite de créditos

Los créditos se suman por curso, no por componente:

```text
SUM(DISTINCT courses.credits)
  <= MIN(students.credit_limit, academic_periods.max_student_credits)
```

### H12 — Vacantes por oferta de componente

Cada `course_schedule_assignment` tiene `max_capacity` y `enrolled_count`. El solver reserva vacante por cada componente elegido.

Para que un estudiante reciba un curso con teoría/práctica, debe haber vacante en todas las ofertas de componentes elegidas.

### H13 — Turno del estudiante

Todos los slots de los componentes elegidos deben calzar con el turno preferido del estudiante. Si no existe combinación en el turno preferido, el solver puede intentar turnos adyacentes y registrar `SHIFT_OVERFLOW`.

### H14 — Curso compuesto indivisible

Un curso con varios componentes se asigna de forma atómica:

```text
asignar THEORY + PRACTICE
o no asignar el curso
```

No se permite que el estudiante quede solo con teoría o solo con práctica.

### H15 — Corequisitos

Los cursos corequisitos siguen agrupados por `course_id`. Si un grupo incluye cursos compuestos, el solver debe asignar todos los componentes de todos los cursos del grupo o ninguno.

### H16 — Tiempo de traslado del estudiante

Se valida traslado entre todos los bloques de componentes elegidos en el horario personal.

---

## Restricciones Blandas

| ID | Descripción |
|---|---|
| S1 | Minimizar huecos en horario estudiantil |
| S2 | Evitar más de 4 horas consecutivas para un docente |
| S3 | Distribuir slots de un componente en días distintos |
| S4 | Preferir aulas con capacidad cercana a la demanda |
| S5 | Agrupar cursos del mismo ciclo en franjas convenientes |
| S6 | Preferir teoría y práctica en días distintos cuando sea posible |

---

## Algoritmo — Fase 1: Horario Institucional

```text
Entrada:
  - academic_period_id
  - courses activos
  - course_components activos
  - teacher_course_components
  - classroom_courses
  - disponibilidades de docentes/aulas
  - time_slots y building_travel_times

Proceso:
  1. Cargar cursos y componentes.
  2. Proyectar demanda por curso.
  3. Para cada componente del curso, calcular N_aulas.
  4. Crear variables CSP por (course_component_id, offer_index).
  5. Ordenar variables por:
       (N_aulas * component.weekly_hours) DESC,
       menos aulas compatibles,
       menos docentes compatibles.
  6. Para cada variable:
       a. Buscar docentes en teacher_course_components.
       b. Buscar aulas autorizadas para course_id y con room_type compatible.
       c. Buscar slots donde docente y aula estén disponibles.
       d. Validar solapamientos y traslado docente.
       e. Backtracking si no hay combinación válida.
  7. Persistir:
       teaching_schedules
       course_schedule_assignments con course_component_id
       course_assignment_slots con course_component_id
```

Salida:

```text
teaching_schedule DRAFT
solver_run SUCCEEDED o FAILED
solver_run_conflicts con causa específica
```

---

## Algoritmo — Fase 2: Horario del Estudiante

```text
Entrada:
  - teaching_schedule CONFIRMED
  - estudiantes activos
  - cursos aprobados
  - ofertas de componentes con vacantes
  - corequisitos
  - turno preferido

Proceso por estudiante:
  1. Calcular cursos candidatos:
       - ciclo permitido
       - no aprobados
       - prerrequisitos aprobados
       - todos sus componentes tienen ofertas disponibles
  2. Agrupar corequisitos por course_id.
  3. Ordenar candidatos por ciclo y créditos.
  4. Para cada curso o grupo:
       a. Intentar elegir una oferta para cada componente requerido.
       b. Verificar vacantes, turno, solapamientos y traslado.
       c. Reservar todos los componentes si el curso completo es válido.
       d. Si falla un componente, liberar reservas parciales.
  5. Persistir:
       student_schedule_items por curso
       student_schedule_item_components por componente elegido
```

El estudiante nunca recibe créditos duplicados por tener teoría y práctica.

---

## Migraciones Requeridas del Solver

Las migraciones estructurales de este cambio viven en:

```text
database/solver/migraciones/
```

Archivo base:

```text
database/solver/migraciones/202604_course_components_solver.sql
```

Incluye:

1. `course_components`.
2. `teacher_course_components`.
3. `course_component_id` en `course_schedule_assignments`.
4. `course_component_id` en `course_assignment_slots`.
5. `student_schedule_item_components`.
6. Backfill de componente `GENERAL` para cursos existentes.
7. Backfill de docentes por componente desde `teacher_courses`.
8. Índices para FKs y búsquedas del solver.

---

## Funciones PL/pgSQL Relevantes

| Función | Responsabilidad |
|---|---|
| `fn_replace_course_components` | Reemplazar componentes de un curso en transacción |
| `fn_list_course_components` | Listar componentes para API de cursos |
| `fn_set_teacher_course_components` | Asignar docentes a componentes |
| `fn_list_teacher_course_component_ids` | Hidratar API de docentes |
| `fn_solver_list_active_course_components` | Entrada principal de componentes al solver |
| `fn_solver_list_teacher_course_components` | Docentes compatibles por componente |
| `fn_solver_persist_teaching_schedule` | Persistir ofertas componente-aula |
| `fn_solver_persist_student_schedule` | Persistir cursos agrupados y componentes elegidos |

---

## Componentes del Microservicio

| Componente | Responsabilidad |
|---|---|
| `SolverInputLoader` | Carga cursos, componentes, docentes, aulas, disponibilidad y estudiantes |
| `DemandProjector` | Calcula ofertas necesarias por componente usando demanda por curso |
| `TeacherScheduleSolver` | Agenda componentes con CSP/backtracking |
| `ConstraintValidator` | Valida restricciones H1-H9 antes de persistir |
| `VacancyTracker` | Controla vacantes por oferta de componente |
| `StudentScheduleSolver` | Asigna cursos completos eligiendo todos sus componentes |
| `CorequisiteGrouper` | Agrupa cursos corequisitos por `course_id` |
| `ShiftFilter` | Filtra slots por turno |
| `TravelTimeChecker` | Valida traslado de docentes y estudiantes |
| `ConflictReporter` | Registra conflictos explicables |

---

## Reglas de Negocio Adicionales

1. El solver siempre genera horarios institucionales en `DRAFT`.
2. Un horario `CONFIRMED` no se modifica directamente.
3. Fase 2 solo opera sobre un `teaching_schedule` confirmado.
4. Si un componente no tiene docente o aula compatible, se registra `NO_ASSIGNMENT_POSSIBLE`.
5. Si un estudiante no consigue todos los componentes de un curso, el curso completo no se asigna.
6. Si una oferta de componente se queda sin vacantes, se registra `NO_VACANCY`.
7. La priorización por GPA aplica al orden de atención de estudiantes, no cambia créditos ni prerrequisitos.
8. `input_hash` debe considerar cursos, componentes, docentes, aulas, slots y restricciones relevantes.
