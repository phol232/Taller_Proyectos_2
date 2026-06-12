# Pruebas E2E

**Framework:** Playwright  
**Ubicación:** `frontend/tests/e2e/`  
**Estructura:**
- `api/` — pruebas de API REST (sin navegador, solo HTTP)
- `flows/` — pruebas de UI con navegador real
- `solver/` — pruebas del microservicio solver (HTTP + WebSocket)

---

## API — `tests/e2e/api/`

Todas las pruebas de API usan `apiLogin()` en `beforeEach` para autenticarse. Cada módulo limpia los registros creados en `afterAll`.

---

### `academic-period.api.spec.ts`

Cubre el CRUD completo de períodos académicos.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /api/academic-periods autenticado | 200 + array |
| GET /api/academic-periods sin auth | 401 |
| POST crear período con todos los campos | 200 + `id` y `code` |
| POST sin código | 400 |
| POST sin nombre | 400 |
| POST sin auth | 401 |
| GET por ID existente | 200 + objeto con `id` |
| GET por ID inexistente | 404 |
| GET /search?q=Test | 200 + array |
| GET /search sin coincidencias | 200 + array vacío |
| PUT actualizar nombre y fechas | 200 + nombre actualizado |
| PUT con ID inexistente | 404 |
| POST activar → desactivar ciclo completo | 204 en ambos |
| POST activar ID inexistente | 404 |
| DELETE elimina período | 204 |
| DELETE ID inexistente | 404 |

---

### `catalog.api.spec.ts`

Cubre CRUD de facultades y carreras.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /facultades autenticado | 200 + array |
| GET /facultades/all (ADMIN) | 200 + array |
| GET /facultades/all sin auth | 401 |
| POST crear facultad con código y nombre | 200 + `id` |
| POST sin nombre | 400 |
| POST sin código | 400 |
| POST código mayor a 20 chars | 400 |
| POST sin auth | 401 |
| PUT actualizar nombre de facultad | 200 + nombre nuevo |
| PUT con ID inexistente | 404 |
| POST desactivar facultad | 204 |
| POST desactivar ID inexistente | 404 |
| DELETE elimina facultad | 204 |
| DELETE ID inexistente | 404 |
| GET /carreras (ADMIN) | 200 + array |
| GET /carreras?facultadId filtra por facultad | 200 + array |
| POST crear carrera con facultadId válido | 200 + `id` |
| POST crear carrera con facultadId inexistente | 404 |
| POST crear carrera sin nombre | 400 |
| POST crear carrera sin auth | 401 |
| GET /carreras?facultadId con facultad inexistente | 200 vacío o 404 |

---

### `classroom.api.spec.ts`

Cubre CRUD de aulas.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /classrooms paginado | 200 + `items` array |
| GET sin auth | 401 |
| POST crear aula con todos los campos | 200 + `id` y `code` |
| POST código duplicado | 409 |
| POST sin código | 400 |
| POST capacidad < 1 | 400 |
| POST tipo vacío | 400 |
| POST sin auth | 401 |
| GET por ID existente | 200 + `id` |
| GET por ID inexistente | 404 |
| GET /search?q=Test | 200 + array |
| GET /search sin resultados | 200 + items vacío |
| PUT actualizar capacidad | 200 + capacidad nueva |
| POST desactivar aula | 204 |
| POST desactivar ID inexistente | 404 |
| DELETE elimina aula → GET retorna 404 | 204 / 404 |
| DELETE ID inexistente | 404 |

---

### `course.api.spec.ts`

Cubre CRUD de cursos.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /courses paginado (default) | 200 + `items` array |
| GET paginación explícita | 200 + ≤ pageSize items |
| GET sin auth | 401 |
| POST crear curso con todos los campos | 200 + `id` y `code` |
| POST sin código | 400 |
| POST sin nombre | 400 |
| POST créditos > 6 | 400 |
| POST ciclo > 10 | 400 |
| POST weeklyHours = 0 | 400 |
| POST sin auth | 401 |
| GET por ID existente | 200 + `id` |
| GET por ID inexistente | 404 |
| GET /search por nombre | 200 + array |
| GET /search por código parcial | 200 |
| GET /search sin coincidencias | 200 + items vacío |
| POST /by-codes con código existente | 200 + curso encontrado |
| POST /by-codes con código inexistente | 200 + lista vacía |
| PUT actualizar créditos | 200 + créditos nuevos |
| POST desactivar curso | 204 |
| POST desactivar ID inexistente | 404 |
| DELETE elimina curso | 204 |
| DELETE ID inexistente | 404 |

---

### `password-reset.api.spec.ts`

Cubre el flujo de reset de contraseña por OTP.

| Prueba | Resultado esperado |
|--------|--------------------|
| POST /request con email registrado | 200 (respuesta genérica) |
| POST /request con email no registrado | 200 (no revela existencia) |
| POST /request con dominio externo (@gmail) | 400 |
| POST /request con email vacío | 400 |
| POST /request con body vacío | 400 |
| POST /request con email inválido | 400 |
| POST /verify con OTP incorrecto (999999) | 400 o 404 |
| POST /verify con OTP no numérico | 400 |
| POST /verify con OTP < 6 dígitos | 400 |
| POST /verify con OTP > 6 dígitos | 400 |
| POST /verify con email vacío | 400 |
| POST /verify con body vacío | 400 |
| POST /reset con token inválido | 400 o 404 |
| POST /reset con token vacío | 400 |
| POST /reset con password < 8 chars | 400 |
| POST /reset con body vacío | 400 |
| Login tras solicitar OTP sigue funcionando | 200 |
| UI /forgot-password carga con input email | visible |
| UI enviar email con dominio externo muestra error | texto `continental.edu.pe` visible |

---

### `profile.api.spec.ts`

Cubre obtener y actualizar el perfil propio del usuario.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /profile/me autenticado | 200 + objeto definido |
| GET /profile/me sin auth | 401 |
| PUT actualizar teléfono y edad | 200 + `phone` actualizado |
| PUT upsert — actualizar solo edad preserva los demás campos | 200 + `age` nuevo |
| PUT DNI con letras | 400 |
| PUT DNI con > 8 dígitos | 400 |
| PUT teléfono que no empieza en 9 | 400 |
| PUT teléfono con < 9 dígitos | 400 |
| PUT edad negativa | 400 |
| PUT más de 2 turnos preferidos | 400 |
| PUT sin auth | 401 |

---

### `scheduling.api.spec.ts`

Cubre generación de horarios, franjas horarias, timetable y horario de estudiante.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /time-slots autenticado | 200 + array |
| GET /time-slots cada franja tiene `id` | válido |
| GET /time-slots sin auth | 401 |
| GET /options con periodId válido | 200 + array |
| GET /options sin periodId | 400 |
| GET /options sin auth | 401 |
| POST /generations con período y aulas reales | 202 + `solverRunId` |
| POST /generations sin academicPeriodId | 400 |
| POST /generations con classroomIds vacío | 400 |
| POST /generations con timeLimitMs < 1000 | 400 |
| POST /generations sin auth | 401 |
| GET /generations/{runId} inexistente | 404 |
| GET /generations/{runId} sin auth | 401 |
| GET /{scheduleId}/timetable inexistente | 404 |
| GET /{scheduleId}/timetable sin auth | 401 |
| GET /{scheduleId}/sections inexistente | 404 |
| GET /{scheduleId}/assignments inexistente | 404 |
| GET /{scheduleId}/assignments sin auth | 401 |
| POST /{scheduleId}/validate cuerpo vacío | 400 |
| DELETE /{scheduleId} inexistente | 404 |
| DELETE /{scheduleId} sin auth | 401 |
| POST /{scheduleId}/confirm inexistente | 404 |
| GET /students/{id}/available-courses sin periodId | 400 |
| GET /students/{id}/available-courses con ID inexistente | 404 |
| GET /students/{id}/schedule con ID inexistente | 204 o 404 |

---

### `sessions.api.spec.ts`

Cubre gestión de sesiones activas y logout global.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /sessions autenticado | 200 + array con ≥ 1 sesión |
| GET /sessions cada sesión tiene `id` | válido |
| GET /sessions sin auth | 401 |
| DELETE /sessions/{id} revoca sesión específica | 204 |
| DELETE /sessions/{id} inexistente | 404 |
| DELETE /sessions/{id} sin auth | 401 |
| POST /logout-all → GET /sessions queda inválido | 401 tras logout |
| Nueva sesión tras logout-all es independiente | login 200 + GET /me 200 |

---

### `student.api.spec.ts`

Cubre CRUD de estudiantes.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /students paginado | 200 + `items` array |
| GET paginación retorna ≤ pageSize | válido |
| GET sin auth | 401 |
| POST crear estudiante completo | 200 + `id`, `code`, `fullName` |
| POST sin código | 400 |
| POST sin nombre | 400 |
| POST ciclo < 1 | 400 |
| POST creditLimit < 1 | 400 |
| POST sin auth | 401 |
| GET por ID existente | 200 + `fullName` |
| GET por ID inexistente | 404 |
| GET /search por nombre | 200 + array |
| GET /search sin resultados | 200 + items vacío |
| PUT actualizar ciclo y carrera | 200 + ciclo nuevo |
| PUT con ID inexistente | 404 |
| POST desactivar estudiante | 204 |
| POST desactivar ID inexistente | 404 |
| DELETE elimina estudiante | 204 |
| DELETE ID inexistente | 404 |

---

### `teacher.api.spec.ts`

Cubre CRUD de docentes.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /teachers paginado | 200 + `items` array |
| GET sin auth | 401 |
| POST crear docente con código, nombre y especialidad | 200 + `id`, `code`, `fullName` |
| POST sin código | 400 |
| POST sin nombre | 400 |
| POST sin especialidad | 400 |
| POST sin auth | 401 |
| GET por ID existente | 200 + `fullName` |
| GET por ID inexistente | 404 |
| GET /search por nombre | 200 + array |
| GET /search sin resultados | 200 + items vacío |
| PUT actualizar especialidad | 200 + especialidad nueva |
| PUT con ID inexistente | 404 |
| POST desactivar docente | 204 |
| POST desactivar ID inexistente | 404 |
| DELETE elimina docente | 204 |
| DELETE ID inexistente | 404 |

---

### `user.api.spec.ts`

Cubre CRUD de usuarios y autenticación.

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /users paginado | 200 + `items` array |
| GET segunda página | 200 |
| GET sin auth | 401 |
| POST crear usuario completo | 200 + `id` y `email` |
| POST usuario creado puede hacer login | login 200 |
| POST email duplicado | 409 |
| POST email sin dominio institucional | 400 |
| POST password < 8 chars | 400 |
| POST sin email | 400 |
| POST rol inválido | 400 |
| GET por ID existente | 200 + `id` |
| GET por ID inexistente | 404 |
| GET /search por nombre | 200 + array |
| GET /search sin resultados | 200 + lista vacía |
| POST desactivar → usuario no puede login | 401 o 403 |
| POST reactivar | 200 |
| POST desactivar ID inexistente | 404 |

---

## Flows — `tests/e2e/flows/`

Pruebas de browser con Playwright que interactúan con la UI real.

---

### `golden-path.spec.ts` — Flujos de navegación admin

| Flujo | Prueba |
|-------|--------|
| Login y Dashboard | Login redirige fuera de `/login`; sesión persiste al navegar; sin sesión redirige a `/login` |
| Períodos Académicos | Navega a `/admin/academic-periods`; lista carga sin errores 500 |
| Aulas | Navega a `/admin/classrooms` correctamente |
| Docentes | Navega a `/admin/teachers` correctamente |
| Cursos | Navega a `/admin/courses` correctamente |
| Usuarios | Navega a `/admin/users` correctamente |
| Facultades | Navega a `/admin/facultades` correctamente |
| Estudiantes | Navega a `/admin/students` correctamente |
| Generación de Horarios | Navega a `/admin/schedule/generate` y `/schedules/view` |
| Perfil | Navega a `/profile` y `/settings` sin error |
| Integración API + UI | Datos creados vía API son visibles en la UI de períodos |
| Vista estudiante | `/student/my-schedule` carga sin error 500 |

---

### `crud.spec.ts` — CRUD UI de Aulas

Flujos interactivos completos en el módulo de Aulas (sin dependencias externas).

| Prueba | Qué verifica |
|--------|-------------|
| Crear aula desde UI | Formulario abre → llena código, nombre, capacidad, tipo → crea → tarjeta visible con vacantes |
| Editar aula (capacidad) | Botón Editar → cambia capacidad a 50 → Guardar → tarjeta muestra nueva capacidad |
| Eliminar aula con confirmación | Botón Eliminar → alertdialog visible → confirma → tarjeta desaparece |
| Flujo completo: crear → editar → eliminar | Ciclo completo verificando cada paso |

---

### `crud-entities.spec.ts` — CRUD UI de otras entidades

Flujos CRUD para Períodos Académicos, Docentes, Cursos y Facultades.

| Módulo | Pruebas (×4 por módulo) |
|--------|------------------------|
| Períodos Académicos | Crear con fechas y máx. créditos; editar créditos; eliminar con confirmación; flujo completo |
| Docentes | Crear con código, nombres, apellidos y especialidad; editar especialidad; eliminar; flujo completo |
| Cursos | Crear con código, nombre, créditos y horas; editar créditos; eliminar; flujo completo |
| Facultades | Crear con código y nombre; editar nombre; eliminar con diálogo de confirmación; flujo completo |

---

## Solver — `tests/e2e/solver/`

---

### `solver-health.spec.ts`

| Prueba | Resultado esperado |
|--------|--------------------|
| GET /healthz | 200 + `{ status: "ok" }` |
| GET /healthz responde en < 2000 ms | tiempo < 2000 ms |
| GET /healthz Content-Type es JSON | `content-type` contiene `application/json` |

---

### `solver-teacher-run.spec.ts`

Cubre el endpoint `POST /api/solver/run` para runs de tipo `TEACHER` y la consulta de estado.

| Prueba | Resultado esperado |
|--------|--------------------|
| POST run TEACHER con datos reales | 202 + `solver_run_id`, `status: PENDING`, `websocket_url` |
| POST sin token interno | 403 |
| POST con token incorrecto | 403 |
| POST TEACHER sin `requested_by` | 403 |
| POST TEACHER sin `rate_limit_reservation_id` | 403 |
| POST `time_limit_ms` < 1000 | 422 |
| POST `time_limit_ms` > 600000 | 422 |
| POST sin `academic_period_id` | 422 |
| GET /runs/{id} inexistente | 404 |
| GET /runs/{id} sin token | 403 |
| GET /runs/{id} estructura correcta (si existe) | `solver_run_id`, `status`, `conflicts` |
| Polling: 3 GET consecutivos a ID inexistente | 404 consistente |

---

### `solver-student-run.spec.ts`

Cubre runs de tipo `STUDENT` y consulta de estado del run resultante.

| Prueba | Resultado esperado |
|--------|--------------------|
| POST run STUDENT con datos reales | 202 + `solver_run_id`, `status: PENDING`, `websocket_url` |
| POST STUDENT sin `student_id` | 422 |
| POST `student_id` con UUID inválido | 422 |
| POST sin token interno | 403 |
| POST `run_type` inválido | 422 |
| POST body completamente vacío | 422 |
| GET /runs/{id} tras run STUDENT: estructura `RunDetailResponse` | `run_type: STUDENT`, `status` en enum, `conflicts` array |

---

### `solver-websocket.spec.ts`

| Prueba | Resultado esperado |
|--------|--------------------|
| WS /ws/runs/{id} con run inexistente cierra conexión con código de error | `close.code` numérico definido |
| WS /ws/runs/{id} con run válido acepta conexión y recibe mensaje o cierra limpiamente | `connected: true` |
| WS /ws/inputs acepta conexión y cierra limpiamente | `connected: true` |

---

## Resumen de cobertura

| Categoría | Archivos | N° pruebas aprox. |
|-----------|----------|-------------------|
| API REST | 11 archivos | ~150 |
| Flows UI (navegación) | 1 archivo | ~14 |
| Flows UI (CRUD browser) | 2 archivos | ~20 |
| Solver (HTTP + WS) | 4 archivos | ~30 |
| **Total** | **18 archivos** | **~214** |

---

## Notas de ejecución

- Requieren `auth.helper.ts` con `API_BASE`, `SOLVER_BASE`, `SOLVER_TOKEN` y credenciales de prueba (excluido de git).
- Para ejecutar todas las pruebas E2E: `cd frontend && npx playwright test`
- Solo pruebas API (sin navegador): `npx playwright test tests/e2e/api/`
- Solo flows UI: `npx playwright test tests/e2e/flows/`
- Solo solver: `npx playwright test tests/e2e/solver/`
- Ver reporte HTML: `npx playwright show-report`
