# Pruebas del Solver — Unitarias e Integración

**Framework:** pytest  
**Ubicación:** `solver/tests/`  
**Archivos:**
- `test_components.py` — pruebas unitarias en memoria (sin BD)
- `test_integration.py` — pruebas de integración contra BD real
- `test_parallel.py` — pruebas de integración del solver paralelo en memoria

---

## Descripción general

El solver es un servicio Python que genera horarios académicos mediante búsqueda local con restricciones. Las pruebas cubren tres niveles:

1. **Pruebas unitarias** (`test_components.py`): verifican cada componente del solver de forma aislada usando datos sintéticos en memoria, sin base de datos. Cubren validadores de restricciones H1–H15, el proyector de demanda, el filtro de turnos, la búsqueda local y el solver principal.
2. **Pruebas de integración con BD real** (`test_integration.py`): cargan datos reales desde PostgreSQL y verifican que el pipeline completo (carga → proyección de demanda → validación → resolución) funciona correctamente con datos de producción.
3. **Pruebas del solver paralelo** (`test_parallel.py`): verifican el comportamiento del portafolio paralelo de la Fase 1 usando datos en memoria, sin base de datos.

---

## Nomenclatura de restricciones (Hx)

| Código | Restricción |
|--------|-------------|
| H1 | Sin solapamiento de docente |
| H2 | Sin solapamiento de aula |
| H3 | Disponibilidad del docente |
| H4 | Disponibilidad del aula |
| H5 | Compatibilidad aula-componente (tipo de sala + autorización) |
| H6 | Competencia del docente por componente |
| H7 | Horas exactas por componente en bloques compactos del mismo día |
| H9 | Tiempo de traslado entre edificios |
| H10 | Prerrequisitos aprobados |
| H11 | Límite de créditos por ciclo |
| H12 | Vacantes por oferta |
| H13 | Turno del estudiante |
| H14 | Componentes compuestos (THEORY+PRACTICE juntos) |
| H15 | Corequisitos |

---

## `test_components.py` — Pruebas unitarias (en memoria)

Todas las pruebas de este archivo son completamente autónomas: construyen datos sintéticos con `uuid4()` y no requieren base de datos ni variables de entorno.

---

### VacancyTracker

| Prueba | Qué verifica |
|--------|-------------|
| `test_vacancy_tracker_reserve_release` | `reserve()` descuenta vacantes; `release()` las restaura; `free()` devuelve el conteo correcto; no se puede reservar una oferta ya llena |
| `test_h12_vacancy_full_offer_not_reservable` | **H12**: oferta con `max_capacity == enrolled_count` → `free() == 0` y `reserve()` retorna `False` |
| `test_h12_reserve_release_cycle` | **H12**: ciclo completo de reservas hasta agotar y liberación restaura el conteo |
| `test_h12_vacancy_tracker_groups_by_course` | **H12**: `offers_for_course()` devuelve todas las ofertas del mismo `course_id` |
| `test_h12_vacancy_tracker_groups_by_component` | **H12**: `offers_for_component()` devuelve las ofertas del mismo `course_component_id`; `has_vacancy()` filtra correctamente las llenas |

---

### CorequisiteGrouper

| Prueba | Qué verifica |
|--------|-------------|
| `test_corequisite_grouper_components` | Cursos en cadena A↔B↔C forman un grupo de 3; el curso independiente D queda como grupo de 1 |
| `test_h15_corequisite_group_forms_single_atomic_unit` | **H15**: tres cursos con corequisitos mutuos forman un único grupo atómico |
| `test_h15_independent_course_stays_singleton` | **H15**: curso sin corequisitos → grupo de tamaño 1 |
| `test_h15_corequisite_partial_overlap` | **H15**: cadena A→B→C donde A coreq B y B coreq C → un solo grupo de 3 |

---

### ShiftFilter

| Prueba | Qué verifica |
|--------|-------------|
| `test_shift_filter_morning_only` | Slot de mañana clasifica como `MORNING`; slot de tarde como `AFTERNOON`; `FLEXIBLE` acepta cualquiera |
| `test_h13_slot_in_correct_shift` | **H13**: clasificación correcta para turnos MORNING, AFTERNOON y EVENING; turnos adyacentes son mutuamente excluyentes |
| `test_h13_flexible_shift_accepts_any` | **H13**: `FLEXIBLE` acepta mañana, tarde y noche |
| `test_h13_adjacent_shifts_order` | **H13**: el primer turno adyacente a MORNING es AFTERNOON |

---

### TravelTimeChecker

| Prueba | Qué verifica |
|--------|-------------|
| `test_travel_time_blocks_consecutive_far_buildings` | Con brecha de 10 min y tiempo requerido de 15 min → inviable; mismo edificio → siempre viable |
| `test_travel_time_allows_when_gap_sufficient` | Con brecha amplia (>15 min) entre edificios → viable |
| `test_h9_travel_time_violation_detected_by_validator` | **H9**: `ConstraintValidator` detecta violación cuando traslado A→B requiere 20 min pero la brecha entre bloques es de 10 min |

---

### DemandProjector

| Prueba | Qué verifica |
|--------|-------------|
| `test_demand_projector_falls_back_to_one` | Sin estudiantes cargados, `DemandProjector` asigna `n_classrooms = 1` como fallback |
| `test_demand_projector_calculates_n_classrooms` | Con 45 estudiantes elegibles y aulas de 20 plazas → `ceil(45/20) = 3` aulas |
| `test_demand_projector_no_compatible_classroom_falls_back` | Aula con `room_type` incompatible → `avg_cap = 0` → `n_classrooms = 1` (fallback) |
| `test_h10_demand_respects_prerequisites` | **H10**: solo cuenta el estudiante que tiene el prerrequisito aprobado (`eligible_students == 1`) |
| `test_h10_already_approved_not_eligible` | **H10**: estudiante que ya aprobó el curso no vuelve a ser elegible (`eligible_students == 0`) |
| `test_h11_credit_limit_constrains_demand` | **H11**: estudiante de ciclo 1 no es elegible para curso de ciclo 3 (`eligible_students == 0`) |

---

### SolverOrchestrator — Reglas de secciones y scope de aulas

| Prueba | Qué verifica |
|--------|-------------|
| `test_orchestrator_applies_elective_max_sections_rule` | `_apply_phase1_section_rules()` limita secciones electivas según `max_sections` de `CourseSchedulingRule` |
| `test_teacher_solver_orders_elective_courses_last` | El solver asigna cursos requeridos antes que electivos; la lista de ofertas respeta ese orden |
| `test_restrict_classrooms_filters_courses_components_and_relations` | `_restrict_classrooms()` elimina cursos, componentes, relaciones y dependencias externas al scope seleccionado |
| `test_selected_classroom_scope_ignores_external_unassignable_course` | Con scope de aula, el solver solo genera oferta para el curso asignable; el componente externo no aparece en la demanda |
| `test_selected_classroom_scope_keeps_only_explicit_components_when_parent_row_exists` | Una fila padre sincronizada para UI no arrastra componentes no marcados explícitamente |
| `test_component_scoped_room_does_not_authorize_sibling_component` | Marcar teoría en un aula no autoriza automáticamente la práctica en esa misma aula |

---

### ConstraintValidator — Restricciones H1–H9

#### H1 — Sin solapamiento de docente

| Prueba | Qué verifica |
|--------|-------------|
| `test_h1_teacher_double_booked_detected` | Mismo docente en el mismo slot en dos ofertas distintas → `ConflictType.NO_ASSIGNMENT_POSSIBLE` |
| `test_h1_teacher_consecutive_different_slots_no_conflict` | Mismo docente en slots distintos → sin conflicto H1 |
| `test_h1_multi_block_single_offer_no_self_overlap` | Oferta compacta de 2 bloques no genera solapamiento consigo misma |

#### H2 — Sin solapamiento de aula

| Prueba | Qué verifica |
|--------|-------------|
| `test_h2_classroom_double_booked_detected` | Misma aula en el mismo slot para docentes distintos → conflicto `"classroom double booked"` |

#### H3 — Disponibilidad del docente

| Prueba | Qué verifica |
|--------|-------------|
| `test_h3_teacher_unavailable_detected` | Slot fuera de la disponibilidad del docente → conflicto `"teacher not available"` |

#### H4 — Disponibilidad del aula

| Prueba | Qué verifica |
|--------|-------------|
| `test_h4_classroom_unavailable_detected` | Slot fuera de la disponibilidad del aula → conflicto `"classroom not available"` |

#### H5 — Compatibilidad aula-componente

| Prueba | Qué verifica |
|--------|-------------|
| `test_h5_room_type_mismatch_detected` | Componente que requiere `LAB` asignado a aula `AULA` → conflicto `"room_type mismatch"` |
| `test_h5_classroom_not_authorized_for_course` | Aula no listada en `classroom_courses` del curso → conflicto `"not authorised for course"` |

#### H6 — Competencia del docente

| Prueba | Qué verifica |
|--------|-------------|
| `test_h6_teacher_not_competent_detected` | Docente no habilitado en `teacher_course_components` → conflicto `"teacher cannot teach"` |

#### H7 — Horas exactas por componente

| Prueba | Qué verifica |
|--------|-------------|
| `test_h7_wrong_number_of_slots_detected` | Componente de 3h con solo 1 bloque de 90 min → conflicto `"expected duration 3.0h"` |
| `test_h7_correct_slots_no_hours_conflict` | Componente de 3h con 2 bloques de 90 min → sin conflicto de horas |
| `test_h7_multiblock_component_split_across_days_detected` | Componente de 3h con bloques en días distintos → conflicto `"component blocks must be consecutive on the same day"` |

#### H14 — Componentes compuestos

| Prueba | Qué verifica |
|--------|-------------|
| `test_h14_compound_course_components_all_or_nothing` | Un curso con THEORY y PRACTICE tiene ambos componentes registrados con tipos correctos |

---

### SolverInput — Campos del modelo

| Prueba | Qué verifica |
|--------|-------------|
| `test_solver_input_classroom_course_components_field` | `classroom_course_components` es un `defaultdict(set)`; clave inexistente devuelve set vacío |

---

### TeacherScheduleSolver — Integración mínima en memoria

| Prueba | Qué verifica |
|--------|-------------|
| `test_teacher_solver_finds_valid_assignment` | Encuentra 1 oferta válida con datos mínimos; la oferta tiene 2 bloques de 90 min (para 3h semanales); métricas incluyen `attempts` y `score` |
| `test_teacher_solver_respects_single_compatible_classroom_for_any_room_code` | Con una única aula compatible (código arbitrario), el solver la usa sin hardcodear prefijos |
| `test_teacher_solver_respects_component_specific_classrooms` | Teoría y práctica con aulas distintas restringidas → cada componente usa su aula asignada |
| `test_teacher_solver_practice_follows_own_section_theory_not_latest_course_theory` | La práctica de una sección sigue a su propia teoría, no a la teoría más reciente del curso |
| `test_teacher_solver_keeps_flexible_course_out_of_critical_room_when_possible` | Un curso con múltiples aulas posibles no ocupa el aula única que necesita otro curso más restrictivo |
| `test_teacher_solver_prefers_underused_room_with_more_authorized_components` | El solver prefiere el aula con más componentes autorizados (más carga esperada) sobre un aula vacía |
| `test_teacher_solver_candidate_score_prefers_smaller_classroom_gap` | Entre candidatos válidos, prefiere el bloque que deja menor hueco en la ocupación del aula |
| `test_teacher_solver_seed_varies_tied_candidates` | Seeds distintos producen asignaciones de aula distintas cuando hay empate de candidatos |
| `test_teacher_solver_rejects_split_multiblock_assignment` | Componente de 3h con bloques en días distintos no genera oferta (0 ofertas, ≥1 conflicto) |
| `test_teacher_solver_fails_without_available_slots` | Sin slots válidos → 0 ofertas, ≥1 conflicto |
| `test_teacher_solver_fails_without_competent_teacher` | Sin docentes habilitados → 0 ofertas, ≥1 conflicto |

---

### Local Search — Búsqueda local (Hill Climbing)

#### Moves individuales

| Prueba | Qué verifica |
|--------|-------------|
| `test_retime_move_proposes_different_blocks` | `RetimeMove` propone bloques con `start_time` distinto al original |
| `test_room_reassign_uses_different_classroom` | `RoomReassignMove` propone un aula distinta cuando hay alternativas disponibles |
| `test_teacher_reassign_uses_different_teacher` | `TeacherReassignMove` propone un docente distinto cuando hay alternativas disponibles |
| `test_ruin_recreate_preserves_state_on_failure` | Si `RuinAndRecreateMove` no encuentra reconstrucción, el estado interno del solver queda inalterado (`_snapshot` antes == `_snapshot` después) |
| `test_ruin_recreate_produces_feasible_solution` | LNS sobre un problema con 3 cursos no introduce violaciones (validador retorna lista vacía) |

#### LocalSearchImprover

| Prueba | Qué verifica |
|--------|-------------|
| `test_local_search_runs_and_records_metrics` | Después de `solve()`, las métricas contienen `local_search_iters` y `ls_termination_reason` con `iters >= 1` |
| `test_local_search_preserves_feasibility` | La solución post-LS sigue cumpliendo H1–H9 según `ConstraintValidator` |
| `test_multi_start_runs_at_least_one_cycle` | `solve()` ejecuta ≥1 ciclo; métricas incluyen `cycles_run`, `cycle_scores` y `hard_restarts`; `hard_restarts == cycles_run - 1` |
| `test_improver_returns_best_ever_after_kicks` | Tras kicks que empeoran temporalmente, el improver devuelve la mejor solución vista; la solución final es factible |
| `test_improver_respects_deadline` | Con deadline ya vencido, el improver termina en <500 ms y registra `ls_termination_reason == "BUDGET_EXCEEDED"` |

---

## `test_integration.py` — Integración con base de datos real

### Fixtures de conexión

| Fixture | Descripción |
|---------|-------------|
| `loaded_data` | Carga el `SolverInput` completo desde la BD de prueba (`horarios_db_prueba`) sin incluir estudiantes. Alcance de módulo (se ejecuta una sola vez por sesión de prueba). |
| `loaded_data_with_students` | Carga el `SolverInput` incluyendo datos de estudiantes. Alcance de módulo. |

Ambas fixtures usan `SolverInputLoader` y se conectan vía `psycopg3` al DSN configurado en `.env`. Si no hay períodos académicos activos, el test se marca como `skip`.

---

### Pruebas de `SolverInputLoader` — Integridad de la carga de datos

Verifican que el loader construye un `SolverInput` coherente y sin referencias rotas.

| Prueba | Qué verifica |
|--------|-------------|
| `test_loader_carga_cursos` | Al menos 1 curso activo cargado |
| `test_loader_carga_componentes` | Al menos 1 componente; cada `course_id` referenciado existe en `courses` |
| `test_loader_componentes_tienen_tipo_valido` | Todos los componentes tienen tipo `GENERAL`, `THEORY` o `PRACTICE` |
| `test_loader_no_mezcla_general_con_theory_practice` | Un curso no puede tener `GENERAL` mezclado con `THEORY`/`PRACTICE` |
| `test_loader_carga_docentes` | Al menos 1 docente activo |
| `test_loader_carga_aulas` | Al menos 1 aula activa |
| `test_loader_carga_time_slots` | Al menos 1 franja horaria activa |
| `test_loader_teacher_course_components_referencia_componentes` | Cada `comp_id` y `teacher_id` en `teacher_course_components` existen en sus respectivos diccionarios |
| `test_loader_classroom_courses_referencia_cursos` | Cada `course_id` y `classroom_id` en `classroom_courses` existen en sus respectivos diccionarios |
| `test_loader_classroom_course_components_referencia_componentes` | Cada `comp_id` y `classroom_id` en `classroom_course_components` existen en sus respectivos diccionarios |
| `test_loader_teacher_availability_referencia_docentes_y_slots` | Disponibilidades de docente referencian docentes y slots conocidos |
| `test_loader_classroom_availability_referencia_aulas_y_slots` | Disponibilidades de aula referencian aulas y slots conocidos |
| `test_loader_period_max_credits_positivo` | El límite de créditos del período es un entero positivo (> 0) |

---

### Pruebas de `DemandProjector` — Proyección de demanda con datos reales

| Prueba | Qué verifica |
|--------|-------------|
| `test_demand_projector_produce_entrada_por_componente` | `DemandProjector.project()` produce exactamente un `CourseDemand` por cada componente activo |
| `test_demand_projector_n_classrooms_es_positivo` | Todos los componentes necesitan al menos 1 aula (`n_classrooms >= 1`) |
| `test_demand_projector_course_id_correcto` | El `course_id` de cada `CourseDemand` coincide con el `course_id` del componente correspondiente |

---

### Pruebas de `ConstraintValidator` — Validación con datos reales

| Prueba | Qué verifica |
|--------|-------------|
| `test_constraint_validator_acepta_asignacion_valida` | Construye automáticamente una oferta 100 % válida con datos reales (docente habilitado, aula autorizada con `room_type` correcto, slots disponibles en intersección docente-aula) y confirma que el validador no reporta conflictos críticos (se toleran `TRAVEL_TIME_VIOLATION` esperables). Si no existe ningún componente asignable, el test hace `skip`. |

---

### Pruebas de `TeacherScheduleSolver` — Resolución con datos reales (Fase 1)

Todos los tests corren el solver con límite de 60 segundos. Si el tiempo se agota el test pasa igualmente (los datos de prueba pueden tener disponibilidades incompletas); lo que no debe ocurrir es una excepción.

| Prueba | Qué verifica |
|--------|-------------|
| `test_teacher_solver_corre_sin_reventar_con_datos_reales` | El solver retorna `solution.offers` (lista) y `conflicts` (lista) sin lanzar excepción; imprime resumen de asignaciones realizadas |
| `test_teacher_solver_offers_respetan_h7` | Cada oferta generada tiene exactamente el número de bloques de 90 min que exige `weekly_hours`; todos los slots son bloques maestros; los bloques son consecutivos en el mismo día (**H7**) |
| `test_teacher_solver_offers_respetan_h1_h2` | No existen dos ofertas con el mismo docente en el mismo slot (**H1**) ni con la misma aula en el mismo slot (**H2**) |
| `test_teacher_solver_offers_respetan_h6` | Cada oferta usa un docente habilitado para el componente asignado (**H6**) |
| `test_teacher_solver_offers_respetan_h5` | Cada oferta usa un aula autorizada para el curso/componente con el `room_type` correcto (**H5**) |

---

## `test_parallel.py` — Integración del solver paralelo (Fase 1)

Las pruebas usan un dataset en memoria con 2 cursos teóricos asignables: 1 docente, 1 aula y 2 bloques maestros consecutivos disponibles. El dataset es trivialmente factible para verificar comportamiento del portafolio sin dependencias externas.

### Dataset de prueba

```
Curso A (THEORY, 1.5h) + Curso B (THEORY, 1.5h)
Docente único, Aula única, 2 bloques lunes (07:00-08:30 y 08:40-10:10)
Solución esperada: 2 ofertas, 0 conflictos
```

### Pruebas

| Prueba | Qué verifica |
|--------|-------------|
| `test_parallel_produces_complete_solution_and_metrics` | `solve_phase1_parallel` con `n_workers=2, n_cycles=2` coloca las 2 ofertas sin conflictos; las métricas incluyen `parallel_workers=2`, `parallel_cycles=2`, `parallel_waves_run >= 1`, `missing_offers=0`; los agregados `total_attempts >= attempts` y `hard_restarts == cycles - 1` |
| `test_parallel_falls_back_to_sequential_when_single_cycle` | Con `n_workers=1, n_cycles=1` produce 2 ofertas correctamente y **no** emite métricas de paralelismo (`parallel_workers` ausente en `metrics`) |
| `test_parallel_respects_wall_clock_budget` | Con `time_limit_ms=3000` y `time_factor=0.6` la ejecución real no supera `3000 + 4000ms` (margen para inicialización del pool); aun así coloca las 2 ofertas |
| `test_parallel_reproducible_quality_for_feasible_dataset` | Dos ejecuciones con `seed=42` sobre datasets equivalentes producen el mismo número de ofertas (`len = 2`) y `missing_offers = 0` en ambos casos |

---

## Resumen de cobertura

| Archivo | Tipo | N° pruebas aprox. | Requiere BD |
|---------|------|-------------------|-------------|
| `test_components.py` | Unitarias | ~60 | No |
| `test_integration.py` | Integración | ~18 | Sí (`horarios_db_prueba`) |
| `test_parallel.py` | Integración | 4 | No |

---

## Notas de ejecución

- Las pruebas de `test_integration.py` requieren la variable de entorno `DATABASE_URL` (o `db_dsn`) apuntando a la BD de prueba (`horarios_db_prueba`).
- Las pruebas de `test_components.py` y `test_parallel.py` son completamente autónomas y no requieren BD.
- Para ejecutar solo las pruebas unitarias: `pytest solver/tests/test_components.py -v`
- Para ejecutar las pruebas de integración con BD: `pytest solver/tests/test_integration.py -v`
- Para ejecutar las pruebas del solver paralelo: `pytest solver/tests/test_parallel.py -v`
- Para ejecutar todas las pruebas del solver: `pytest solver/tests/ -v`

---

## Evidencia de ejecución

- [Resultado de pruebas de integración — 2026-06-12](../Artefactos/evidencias/evidencia_tests_integracion_solver.md)
