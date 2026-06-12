# Pruebas del Frontend

**Framework:** Vitest + Testing Library React + userEvent  
**Ubicación:** `frontend/tests/`  
**Estructura:** `unit/` (11 archivos) y `integration/` (11 archivos)

---

## Pruebas Unitarias

Las pruebas unitarias verifican funciones y componentes aislados, sin dependencias de red ni estado global real.

---

### 1. `adminSchemas.test.ts` — Validación de esquemas y manejo de errores de API

**Módulo probado:** `lib/validators/academic-period.schema` y `lib/adminApi.getApiErrorMessage`

| Caso | Descripción |
|------|-------------|
| Período académico válido | `academicPeriodSchema` acepta un objeto con código, nombre, fechas, estado y créditos válidos |
| Rango de fechas inválido | `academicPeriodSchema` rechaza cuando `startsAt` es posterior a `endsAt` |
| Prioriza mensaje del backend | `getApiErrorMessage` retorna `response.data.message` cuando existe |
| Usa fallback | `getApiErrorMessage` retorna el texto por defecto cuando no hay detalles |

---

### 2. `api.interceptor.test.ts` — Interceptor de respuesta Axios

**Módulo probado:** `lib/api` (interceptor de errores HTTP) y `lib/sessionRecovery`

| Caso | Descripción |
|------|-------------|
| 401 desde `/api/auth/login` | No abre recuperación de sesión ni redirige |
| 401 desde `/api/auth/password-reset/verify` | No abre recuperación ni redirige |
| 401 desde endpoint protegido | Abre recuperación de sesión (`hasPendingSessionRecovery = true`) sin redirigir inmediatamente |
| 401 desde `/api/auth/refresh` | Limpia sesión y redirige a `/login` |
| Restaura sesión y reintenta | Llama a `/api/auth/refresh`, luego reintenta la request original exitosamente |
| Múltiples 401 simultáneos | Un solo refresh reintenta todas las requests pendientes en cola |
| Refresh falla | Rechaza todas las requests pendientes y limpia la cola |
| 403 | Muestra toast "Sin permisos" |
| 409 | Muestra toast "Conflicto de recurso" |
| 500 | Muestra toast "Error del servidor" |
| Error sin response | Muestra toast "Error de conexión" |

---

### 3. `confirmScheduleScreen.test.tsx` — Componente ConfirmScheduleScreen

**Módulo probado:** `components/schedule/ConfirmScheduleScreen`

| Caso | Descripción |
|------|-------------|
| Muestra horario confirmado y borradores | Renderiza el título, suscribe al evento SSE `schedules.changed`, lista el horario confirmado y los borradores disponibles con su enlace de vista previa |
| Confirma un borrador | Al hacer clic en "Confirmar" y luego "Confirmar y publicar", llama a `confirmScheduleOption` y muestra el toast de éxito |

---

### 4. `credits.test.ts` — Funciones de créditos

**Módulo probado:** `lib/schedule/credits` — `sumCredits` y `exceedsLimit`

| Caso | Descripción |
|------|-------------|
| Suma correcta | Suma los créditos de múltiples asignaciones usando el mapa de créditos |
| Cursos sin créditos en el mapa | Usa 0 por defecto para claves inexistentes |
| Lista vacía | Retorna 0 |
| Excede el límite | `exceedsLimit(18, 5, 22)` → `true` |
| Alcanza exactamente el límite | `exceedsLimit(17, 5, 22)` → `false` |
| Queda espacio disponible | `exceedsLimit(15, 4, 22)` → `false` |

---

### 5. `formValidation.test.ts` — Validación de formularios de autenticación

**Módulo probado:** Lógica de validación de `login/page.tsx` y `forgot-password/page.tsx`

**Login (`validateLoginForm`):**

| Caso | Resultado esperado |
|------|-------------------|
| Email vacío | Error "El correo es obligatorio." |
| Dominio externo (`@gmail.com`) | Error de dominio `@continental.edu.pe` |
| Dominio parcial (`@continental.edu`) | Error de dominio |
| Email institucional correcto | Sin error de email |
| Contraseña vacía | Error "La contraseña es obligatoria." |
| Credenciales válidas | Sin errores |
| Ambos campos vacíos | Dos errores (email y contraseña) |

**Recuperar contraseña — paso 1 (`validateForgotEmail`):**

| Caso | Resultado esperado |
|------|-------------------|
| Email vacío | Error requerido |
| Dominio externo | Error de dominio |
| Email institucional | Sin error |

**Recuperar contraseña — paso 3 (`validateNewPassword`):**

| Caso | Resultado esperado |
|------|-------------------|
| Menos de 8 caracteres | Error de longitud mínima |
| Contraseñas que no coinciden | Error en `confirmError` |
| Contraseñas válidas y coincidentes | Sin errores |
| Sin complejidad requerida (sin mayúscula ni especial) | Enumera los requerimientos faltantes |
| Símbolos especiales como `_` y `#` | Válida |
| Contraseña con espacio | Error específico de espacios |
| Contraseña vacía | Error de longitud |

---

### 6. `overlap.test.ts` — Detección de solapamiento de franjas horarias

**Módulo probado:** `lib/schedule/overlap` — `timeSlotsOverlap` y `findTeacherOverlaps`

| Función | Caso | Resultado |
|---------|------|-----------|
| `timeSlotsOverlap` | Solapamiento total (mismo horario) | `true` |
| `timeSlotsOverlap` | Solapamiento parcial | `true` |
| `timeSlotsOverlap` | Días distintos | `false` |
| `timeSlotsOverlap` | Franjas contiguas | `false` |
| `timeSlotsOverlap` | Franjas separadas | `false` |
| `findTeacherOverlaps` | Mismo docente, slots distintos | Sin conflictos |
| `findTeacherOverlaps` | Mismo docente, mismo slot | 1 conflicto |
| `findTeacherOverlaps` | Docentes distintos, mismo slot | Sin conflictos |

---

### 7. `prerequisites.test.ts` — Validación de prerrequisitos

**Módulo probado:** `lib/schedule/prerequisites` — `getMissingPrerequisites` y `hasAllPrerequisites`

| Función | Caso | Resultado |
|---------|------|-----------|
| `getMissingPrerequisites` | Todos aprobados | Lista vacía |
| `getMissingPrerequisites` | Uno faltante | Retorna el faltante |
| `getMissingPrerequisites` | Ninguno aprobado | Retorna todos |
| `getMissingPrerequisites` | Curso sin prerrequisitos | Lista vacía |
| `hasAllPrerequisites` | Todos aprobados | `true` |
| `hasAllPrerequisites` | Falta alguno | `false` |

---

### 8. `scheduleBuilderApi.test.ts` — API del constructor de horarios

**Módulo probado:** `lib/scheduleBuilderApi`

| Función | Descripción |
|---------|-------------|
| `getTimeSlots` | GET `/api/schedules/time-slots` — retorna lista de franjas |
| `getScheduleAssignments` | GET `/api/schedules/:id/assignments` — retorna asignaciones del horario |
| `addCourseAssignment` + `addSlot` | POST con payload de componente, docente y franjas; verifica URL y cuerpo |
| `removeAssignment` + `removeSlot` | DELETE de asignación y franja; retorna resultado de franja incompleta |
| `validateSlot` | POST `/api/schedules/:id/validate` — retorna lista de conflictos (ej. `TEACHER_BUSY`) |

---

### 9. `scheduleBuilderComponents.test.tsx` — Componentes del constructor de horarios

**Módulos probados:** `ModeSelectorDialog`, `ClassroomMatrixView`, `SlotDetailDialog`, `AddCourseDialog`

| Componente | Caso |
|-----------|------|
| `ModeSelectorDialog` | Traduce las tres opciones (Teoría, Práctica, Curso completo) al modo y componente correcto llamando a `onPick` |
| `ClassroomMatrixView` | Muestra las asignaciones existentes; permite abrir celda ocupada (`onSlotClick`) y celda vacía (`onEmptyCellClick`) |
| `SlotDetailDialog` | Cuando quitar una franja deja la asignación incompleta, pide confirmación y permite eliminar la asignación completa |
| `AddCourseDialog` | Selección de curso → componente → docente → aula → franja; llama a `validateSlot` y luego `addCourseAssignment` con el payload correcto |

---

### 10. `sessionExpiredDialog.test.tsx` — Diálogo de sesión expirada

**Módulo probado:** `components/shared/SessionExpiredDialog`

| Caso | Descripción |
|------|-------------|
| Renderiza cuando la sesión expira | Muestra el título "Sesión expirada" y los botones "Restaurar sesión" y "Cerrar sesión" |
| Restaura sesión | Llama a `/api/auth/refresh`, ejecuta el retry de la request original y oculta el diálogo |
| Cierra sesión | Llama a `/api/auth/logout` y redirige a `/login` |

---

### 11. `utils.test.ts` — Utilidades generales

**Módulo probado:** `lib/utils` — `cn`, `toastError`, `toastSuccess`

| Función | Caso |
|---------|------|
| `cn()` | Combina clases, resuelve conflictos Tailwind (el último gana), omite valores falsy, acepta objetos condicionales |
| `toastError()` | Llama a `toast.error` con título y duración 2000ms; incluye descripción cuando se provee |
| `toastSuccess()` | Llama a `toast.success` con título y duración 1000ms; incluye descripción cuando se provee |

---

## Pruebas de Integración

Las pruebas de integración verifican la colaboración entre módulos reales (stores Zustand, hooks, clientes HTTP) usando mocks de red (spies sobre `api.get/post/delete/put`).

---

### 1. `adminApi.integration.test.ts` — Cliente HTTP del panel de administración

**Módulo probado:** `lib/adminApi`

Verifica que cada función construye la URL y los parámetros correctos hacia el backend:

| Recurso | Operaciones verificadas |
|---------|------------------------|
| **Usuarios** | `listUsers` (paginación por defecto y personalizada), `searchUsers`, `createUser`, `activateUser`, `deactivateUser` |
| **Cursos** | `listCourses`, `searchCourses`, `findCoursesByCodes` (incluyendo lista vacía sin llamada HTTP), `createCourse`, `updateCourse`, `deactivateCourse`, `deleteCourse` |
| **Docentes** | `listTeachers`, `searchTeachers`, `createTeacher`, `updateTeacher`, `deactivateTeacher`, `deleteTeacher` |
| **Aulas** | `listClassrooms`, `searchClassrooms`, `createClassroom`, `updateClassroom`, `deactivateClassroom`, `deleteClassroom` |
| **Estudiantes** | `listStudents`, `searchStudents`, `createStudent`, `updateStudent`, `deactivateStudent`, `deleteStudent` |
| **Períodos académicos** | `listAcademicPeriods`, `searchAcademicPeriods`, `createAcademicPeriod`, `updateAcademicPeriod`, `activateAcademicPeriod`, `deactivateAcademicPeriod`, `deleteAcademicPeriod` |
| **Facultades y Carreras** | `listCatalogFacultades`, `listCatalogCarreras` (con y sin `facultadId`), `listAllFacultades`, `listAllCarrerasByFacultad`, `createFacultad`, `updateFacultad`, `deactivateFacultad`, `deleteFacultad`, `createCarrera`, `updateCarrera`, `deactivateCarrera`, `deleteCarrera` |
| **Utilidades** | `getApiErrorMessage`: extrae del servidor, usa mensaje de axios, usa fallback |

---

### 2. `authStore.integration.test.ts` — Store de autenticación (Zustand)

**Módulo probado:** `store/auth.store`

| Área | Casos |
|------|-------|
| Estado inicial | No autenticado por defecto (`user=null`, `role=null`, `isAuthenticated=false`) |
| `login` | Establece user/role/isAuthenticated; normaliza role a minúsculas; preserva todos los campos; acepta todos los roles (ADMIN, STUDENT, TEACHER, COORDINATOR); actualiza si se llama dos veces (re-login) |
| `logout` | Limpia user/role/isAuthenticated; no lanza si se llama sin sesión activa |
| `setHasHydrated` | Actualiza `_hasHydrated` a `true` y de vuelta a `false` |

---

### 3. `notificationStore.integration.test.ts` — Store de notificaciones (Zustand)

**Módulo probado:** `store/notification.store`

| Área | Casos |
|------|-------|
| Estado inicial | `conflicts` vacío; 3 notificaciones del sistema; la notificación de seguridad marcada como leída |
| `addConflict` | Agrega un conflicto; acumula múltiples; preserva orden; soporta todos los tipos (`overlap_teacher`, `overlap_classroom`, `overlap_student`, `credits_exceeded`, `prerequisite_missing`, `no_vacancy`, `no_solution`) |
| `clearConflicts` | Vacía la lista; no lanza sin conflictos activos; no afecta `systemNotifications` |
| `markAllNotificationsRead` | Marca todas como leídas; mantiene la cantidad; preserva ids y kinds; es idempotente |

---

### 4. `profileApi.integration.test.ts` — API de perfil de usuario

**Módulo probado:** `lib/profileApi`

| Función | Casos |
|---------|-------|
| `getMe` | GET `/api/profile/me`: retorna perfil completo; retorna perfil con campos opcionales en `null`; propaga error de red |
| `upsertMe` | PUT `/api/profile/me`: payload completo; turnos preferidos múltiples; campos opcionales en `null`; propaga error de validación |

---

### 5. `scheduleApi.integration.test.ts` — API de horarios

**Módulo probado:** `lib/scheduleApi`

| Función | Descripción |
|---------|-------------|
| `getSectionsBySchedule` | GET `/api/schedules/:id/sections` |
| `generateScheduleOption` | POST `/api/schedules/generations` con payload de período, aulas y tiempo |
| `getScheduleOptions` | GET `/api/schedules/options?academicPeriodId=...` |
| `getScheduleGenerationRun` | GET `/api/schedules/generations/:runId` — estado `SUCCEEDED` y `FAILED` con conflictos |
| `confirmScheduleOption` | POST `/api/schedules/:id/confirm` |
| `getTimetable` | GET `/api/schedules/:id/timetable` — lista con slots y lista vacía |
| `cancelScheduleOption` | DELETE `/api/schedules/:id` con `suppressGlobalErrorToast: true` |

---

### 6. `scheduleStore.integration.test.ts` — Store de horario del estudiante (Zustand)

**Módulo probado:** `store/schedule.store`

| Área | Casos |
|------|-------|
| Estado inicial | `draft=null`, `status='idle'` |
| `setDraft` | Establece borrador y cambia status a `'draft'`; reemplaza borrador existente |
| `updateAssignment` | Actualiza asignación existente; agrega nueva si no existe; no modifica estado sin borrador; no afecta otras asignaciones |
| `removeAssignment` | Elimina por id; no elimina si el id no existe; no modifica sin borrador; deja borrador con 0 asignaciones |
| `setStatus` | Actualiza a `'confirmed'`, `'cancelled'`, `'idle'` |
| `clearDraft` | Limpia borrador y restaura status a `'idle'`; no lanza sin borrador activo |

---

### 7. `studentScheduleApi.integration.test.ts` — API del estudiante

**Módulo probado:** `lib/studentScheduleApi`

| Función | Casos |
|---------|-------|
| `getCurrentStudent` | GET `/api/students/me`: datos del estudiante autenticado; estudiante sin carrera/facultad; propaga error 401 |
| `getStudentAvailableCourses` | GET `/api/students/:id/available-courses?periodId=...`: lista de cursos; lista vacía; múltiples cursos con secciones |
| `getStudentActiveSchedule` | GET `/api/students/:id/schedule`: horario activo (200); retorna `null` si no hay horario (204); envía `suppressGlobalErrorToast`; horario en estado CONFIRMED |

---

### 8. `useAdminEvents.integration.test.ts` — Hook de eventos SSE administrativos

**Módulo probado:** `hooks/useAdminEvents` (integración con `EventSource` mockeado)

| Caso | Descripción |
|------|-------------|
| Crea EventSource con URL correcta | Contiene `/api/admin/events` y `withCredentials=true` |
| Registra listener para un evento | Llama a `addEventListener` con el tipo de evento indicado |
| Registra listeners para múltiples eventos | Llama a `addEventListener` por cada tipo de evento |
| Invoca el handler al recibir evento | El listener SSE llama al callback |
| No dispara en primer `onopen` | La conexión inicial no cuenta como actualización |
| Dispara en el segundo `onopen` | La reconexión sí activa el handler |
| Cierra y elimina listeners al desmontar | `removeEventListener` y `close` son llamados |
| Cierra todos los listeners con múltiples eventos | `removeEventListener` por cada tipo al desmontar |
| No lanza cuando `onerror` es invocado | El hook maneja errores sin excepciones |

---

### 9. `useAuth.integration.test.ts` — Hook de autenticación

**Módulo probado:** `hooks/useAuth` integrado con `store/auth.store`

| Caso | Descripción |
|------|-------------|
| Estado inicial | No autenticado (`user=null`, `role=null`, `isAuthenticated=false`) |
| `login` | Actualiza user, role e isAuthenticated en el store reactivo |
| `logout` | Limpia user, role e isAuthenticated |
| `hasRole` | `false` sin sesión; `true` cuando el rol coincide; `false` cuando no coincide; distingue correctamente los 4 roles del sistema |
| Normalización de rol | Login con `"ADMIN"` mayúscula → `role = "admin"` en el store |

---

### 10. `useConflictDetector.integration.test.ts` — Hook de detección de conflictos

**Módulo probado:** `hooks/useConflictDetector`

| Área | Casos |
|------|-------|
| Sin conflictos | Lista vacía para 0 o 1 asignación; múltiples asignaciones sin solapamiento |
| Solapamiento de docente | Detecta mismo docente en mismo horario; detecta solapamiento parcial; sin conflicto en días distintos; sin conflicto en horarios consecutivos |
| Solapamiento de aula | Detecta misma aula en mismo horario; sin conflicto en horarios diferentes |
| Conflictos simultáneos | Detecta `overlap_teacher` y `overlap_classroom` al mismo tiempo |
| Memoización | La función `detect` permanece referencialmente estable entre re-renders (`useCallback`) |

---

### 11. `useScheduleValidation.integration.test.ts` — Hook de validación de matrícula

**Módulo probado:** `hooks/useScheduleValidation`

| Área | Casos |
|------|-------|
| Sin conflictos | Retorna lista vacía cuando todo es válido |
| Prerrequisitos (RF-05, RF-14) | Detecta prerrequisito no aprobado con mensaje específico; sin conflicto si ya aprobado; detecta múltiples faltantes en un solo conflicto |
| Límite de créditos (RF-13, RF-14) | Detecta exceso mostrando totales; sin conflicto al alcanzar exactamente el límite; sin conflicto con créditos dentro del rango |
| Vacantes (RF-14) | Detecta vacantes = 0; sin conflicto con al menos 1 vacante; detecta vacantes negativas |
| Solapamiento de horario (RF-14) | Detecta solapamiento total con asignación existente; detecta solapamiento parcial; sin conflicto en horarios consecutivos; sin conflicto en días distintos |
| Conflictos múltiples simultáneos | Detecta los 4 tipos de conflicto en una sola validación |
| Memoización | La función `validate` permanece referencialmente estable (`useCallback`) |

---

## Resumen de cobertura

| Tipo | Archivos | Áreas cubiertas |
|------|---------|-----------------|
| Unitarias | 11 | Funciones puras (créditos, solapamiento, prerrequisitos, validación de formularios), API HTTP, componentes React, interceptor Axios, utilidades |
| Integración | 11 | Stores Zustand, hooks con lógica de negocio, clientes HTTP contra endpoints del backend, SSE admin events |
| **Total** | **22** | Toda la capa de lógica de frontend |
