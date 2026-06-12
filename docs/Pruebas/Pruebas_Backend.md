# Pruebas Unitarias del Backend

**Framework:** JUnit 5 + Mockito + Spring MockMvc  
**Ubicación:** `Backend/horarios_api/src/test/java/online/horarios_api/`  
**Total de clases de prueba:** 36
**Áreas cubiertas:** Controladores MVC, servicios, validación de DTOs, seguridad, gestión de tokens, lógica de negocio de autenticación, períodos académicos, cursos, aulas, docentes, estudiantes, recuperación de contraseña, construcción y generación de horarios.
---

## Módulo: Autenticación (`auth/`)

### `AuthControllerTest` — Controlador de login

**Endpoint:** `POST /api/auth/login`

| Caso | Resultado esperado |
|------|-------------------|
| Credenciales válidas (email institucional + contraseña ≥ 8 chars) | 200 con `AuthResponse` conteniendo `user.email` |
| Dominio de email inválido (`@gmail.com`) | 400 Bad Request |
| Email vacío | 400 Bad Request |
| Contraseña menor a 8 caracteres | 400 Bad Request |
| Servicio lanza `UnauthorizedException` | 401 Unauthorized |
| Servicio lanza `ForbiddenException` (cuenta desactivada) | 403 Forbidden |

---

### `AuthServiceTest` — Lógica de negocio de autenticación

| Método | Caso | Resultado esperado |
|--------|------|-------------------|
| `login` | Credenciales válidas | Retorna `AuthResult` con `user`, `accessToken` y `refreshToken` |
| `login` | Credenciales inválidas | Propaga `UnauthorizedException` |
| `loginOAuth2` | Usuario OAuth2 | Retorna `AuthResult` con tokens generados |
| `refresh` | Token válido | Rota el token y retorna nuevo `AuthResult` |
| `refresh` | Token `null` | Lanza `UnauthorizedException` con mensaje "Refresh token no encontrado" |
| `refresh` | Token en blanco (`"   "`) | Lanza `UnauthorizedException` con mensaje "Refresh token no encontrado" |
| `refresh` | Usuario no encontrado tras rotación | Lanza `UnauthorizedException` con mensaje "Usuario no encontrado" |
| `logout` | Token válido | Invoca `refreshTokenManagerPort.revokeToken` |
| `logoutAll` | Usuario autenticado | Invoca `refreshTokenManagerPort.revokeAllTokensForUser` |

---

### `AuthenticationAdapterTest` — Adaptador Spring Security

| Caso | Resultado esperado |
|------|-------------------|
| Credenciales válidas | Retorna el `UserInfo` extraído del `Authentication.getPrincipal()` |
| `BadCredentialsException` de Spring | Lanza `UnauthorizedException` con mensaje "Credenciales inválidas" |

---

### `CookieServiceTest` — Construcción de cookies HTTP

Verifica que el servicio genera las cabeceras `Set-Cookie` con los atributos `HttpOnly`, `Path` y los valores de token correctos para `access_token` y `refresh_token`.

---

### `JwtGeneratorAdapterTest` — Generación de JWT

Verifica que el adaptador genera tokens JWT firmados con el `UserInfo` recibido, y que el token contiene los claims de `sub`, `role` y `fullName`.

---

### `OAuth2LoginSuccessHandlerTest` — Handler de éxito OAuth2

Verifica que al completar el flujo OAuth2, el handler llama a `AuthService.loginOAuth2`, establece las cookies y redirige al frontend correctamente.

---

### `LoginRequestValidationTest` — Validación del DTO de login

Verifica las restricciones Bean Validation del `LoginRequest`:
- Email no puede estar vacío ni tener dominio distinto a `@continental.edu.pe`
- Contraseña debe tener mínimo 8 caracteres

---

### `CurrentUserServiceTest` — Resolución del usuario actual

Verifica que el servicio extrae el `UserInfo` del contexto de seguridad de Spring cuando el usuario está autenticado, y lanza `UnauthorizedException` cuando no hay principal activo.

---

## Módulo: Períodos Académicos (`academicperiod/`)

### `AcademicPeriodControllerTest` — Controlador MVC

| Caso | Resultado esperado |
|------|-------------------|
| POST con payload inválido (campos vacíos/nulos) | 400 Bad Request; no interactúa con el use case |
| POST con payload válido | 200 OK con `code` del período en el JSON de respuesta |

---

### `AcademicPeriodServiceTest` — Lógica de negocio

| Caso | Resultado esperado |
|------|-------------------|
| Crear período con código y estado con espacios/minúsculas | Normaliza: `" 2026-I "` → `"2026-I"`, `" planning "` → `"PLANNING"`, `maxStudentCredits` usa el valor por defecto (22) si es `null` |
| Fechas inválidas (`startsAt` posterior a `endsAt`) | Lanza `BadRequestException` |

---

## Módulo: Cursos (`course/`)

### `CourseControllerTest` — Controlador MVC

| Caso | Resultado esperado |
|------|-------------------|
| GET `/api/courses` | 200 OK con `content[0].code = "INF-101"` |
| POST con payload inválido (code/name vacíos, cycle/credits/hours = 0) | 400 Bad Request; no interactúa con el use case |
| POST con payload válido | 200 OK con `code` y `cycle` correctos en el JSON |

---

### `CourseServiceTest` — Lógica de negocio

| Caso | Resultado esperado |
|------|-------------------|
| Crear curso con código/nombre con espacios | Normaliza: `" inf-101 "` → `"INF-101"`, nombre recortado, `requiredRoomType` en minúsculas |
| Prerrequisitos duplicados o con espacios | Deduplica y normaliza: `["mat-001", "MAT-001", " fis-100 "]` → `["MAT-001", "FIS-100"]` |
| Prerrequisito igual al propio código del curso | Lanza `BadRequestException` |
| Buscar curso inexistente (`getCourse`) | Lanza `NotFoundException` |

---

## Módulo: Aulas (`classroom/`)

### `ClassroomControllerTest` — Controlador MVC

| Caso | Resultado esperado |
|------|-------------------|
| POST con payload inválido (code/name vacíos, capacity = 0) | 400 Bad Request; no interactúa con el use case |
| POST con payload válido | 200 OK con `code = "A-101"` en el JSON |

---

### `ClassroomServiceTest` — Lógica de negocio

Verifica la normalización de datos y validación de reglas de negocio al crear y actualizar aulas (tipo de sala, capacidad positiva, disponibilidad sin solapamiento).

---

## Módulo: Docentes (`teacher/`)

### `TeacherControllerTest` — Controlador MVC

| Caso | Resultado esperado |
|------|-------------------|
| POST con payload inválido (sin código ni nombre) | 400 Bad Request; no interactúa con el use case |
| POST con payload válido | 200 OK con `code = "DOC-01"` y `courseCodes[0] = "INF-101"` |

---

### `TeacherServiceTest` — Lógica de negocio

| Caso | Resultado esperado |
|------|-------------------|
| Crear docente con datos con espacios y duplicados | Normaliza código (`" doc-01 "` → `"DOC-01"`), nombre, specialty; deduplica disponibilidad (2 franjas idénticas → 1); deduplica `courseCodes` (`["inf-101", "INF-101", " mat-001 "]` → `["INF-101", "MAT-001"]`); `isActive` por defecto `true` |
| Franja de disponibilidad inválida (`startTime > endTime`) | Lanza `BadRequestException` |

---

## Módulo: Estudiantes (`student/`)

### `StudentControllerTest` — Controlador MVC

| Caso | Resultado esperado |
|------|-------------------|
| POST con payload inválido (código/nombre vacíos, cycle = 0, creditLimit = 0) | 400 Bad Request; no interactúa con el use case |
| POST con payload válido | 200 OK con `code = "EST-01"` |

---

### `StudentServiceTest` — Lógica de negocio

Verifica la normalización de código del estudiante, validación de ciclo positivo, y la gestión de cursos aprobados.

---

## Módulo: Recuperación de Contraseña (`passwordreset/`)

### `PasswordResetControllerTest` — Controlador MVC

Verifica que el flujo de 3 pasos (solicitar OTP → verificar OTP → resetear contraseña) respeta las restricciones de validación de los DTOs y retorna los códigos HTTP correctos.

---

### `PasswordResetDtoValidationTest` — Validación de DTOs

Verifica las restricciones Bean Validation de:
- `RequestOtpRequest`: email obligatorio con dominio `@continental.edu.pe`
- `VerifyOtpRequest`: OTP de 6 dígitos, email válido
- `ResetPasswordRequest`: nueva contraseña mínimo 8 caracteres, token no vacío

---

### `PasswordResetServiceTest` — Lógica de negocio

**Flujo `requestOtp`:**

| Caso | Resultado esperado |
|------|-------------------|
| Correo existente | Genera token, invalida tokens anteriores, guarda nuevo token, envía email con OTP de 6 dígitos numéricos |
| Correo inexistente | Retorna mensaje genérico ("recibirás...") sin revelar si el email existe; no interactúa con `tokenPort` ni `notificationPort` |
| Rate limit alcanzado (≥ 3 solicitudes recientes) | Retorna respuesta genérica sin guardar token ni enviar email |

**Flujo `verifyOtp`:**

| Caso | Resultado esperado |
|------|-------------------|
| OTP correcto | Retorna `resetToken` no vacío; marca el token como verificado y guarda el hash del reset token |
| OTP incorrecto | Lanza `BadRequestException` |
| Sin token activo | Lanza `BadRequestException` |
| Máximo de intentos superado (≥ 5) | Lanza `TooManyRequestsException` y marca el token como usado |

**Flujo `resetPassword`:**

| Caso | Resultado esperado |
|------|-------------------|
| Token válido | Llama a `passwordChangePort.changePassword` con el hash BCrypt de la nueva contraseña; marca el token como usado con `usedAt` |
| Token inválido o expirado | Lanza `BadRequestException` |

---

## Módulo: Construcción de Horarios (`scheduling/`)

### `ScheduleBuilderControllerTest` — Controlador MVC

Verifica validación de payloads para añadir asignaciones y franjas, y la serialización de conflictos en la respuesta.

---

### `ScheduleBuilderServiceTest` — Lógica de negocio

| Caso | Resultado esperado |
|------|-------------------|
| `addCourse`: docente no asignado al componente | Lanza `BadRequestException` con mensaje "docente seleccionado"; no llama al repositorio |
| `addCourse`: franjas fuera de disponibilidad del docente | Lanza `BadRequestException` con mensaje "no está disponible"; no llama al repositorio |
| `addCourse`: conflictos bloqueantes en `validateSlot` (ej. aula ocupada) | Lanza `BadRequestException` con el mensaje del conflicto; no llama al repositorio |
| `addCourse`: payload válido (sin conflictos) | Delega correctamente al repositorio y retorna el `assignmentId` |
| `validateSlot`: faltan datos obligatorios (`teacherId=null`) | Lanza `BadRequestException` con mensaje "Faltan datos" |
| `removeSlot` | Retorna el `RemovedSlotResult` del repositorio |

---

### `ScheduleGenerationServiceTest` — Generación de horario (interacción con solver)

| Caso | Resultado esperado |
|------|-------------------|
| Reserva aceptada | Llama a `solverClient.runTeacherSchedule` con los parámetros correctos (periodId, actorId, seed aleatorio, timeLimitMs, reservationId, classroomIds); retorna `ScheduleGeneration` con `solverRunId` y `reservationId` |
| Reserva rechazada (rate limit) | Lanza `GenerationRateLimitException` con `retryAfterSeconds=77` y `remaining=0` |

---

## Módulo: Sesiones y Tokens (`token/`)

### `RefreshTokenServiceTest` — Gestión de refresh tokens

| Caso | Resultado esperado |
|------|-------------------|
| `createRefreshToken` | Genera raw token, lo hashea, elimina tokens expirados del usuario, persiste el nuevo token (no revocado) |
| `validateAndRotate`: token válido y no expirado | Retorna `userId` y revoca el token por hash |
| `validateAndRotate`: token expirado | Lanza `UnauthorizedException` |
| `revokeSessionById`: sesión de otro usuario | Lanza `ForbiddenException` |

---

### `TokenCleanupSchedulerTest` — Limpieza programada de tokens

Verifica que el scheduler invoca `refreshTokenPort.deleteExpiredOrRevokedBefore(Instant)` con una fecha en el pasado al ejecutarse.

---

### `SessionControllerTest` — Gestión de sesiones activas

Verifica que el endpoint de listado de sesiones y el de revocación individual funcionan con la autorización correcta.

---

## Módulo: Perfil de Usuario (`profile/`)

### `ProfileServiceTest` — Lógica de negocio del perfil

Verifica que `upsertProfile` guarda los campos de perfil (DNI, teléfono, sexo, edad, facultad, carrera, turnos preferidos) y que `getProfile` retorna el perfil del usuario autenticado o lanza `NotFoundException` si no existe.

---

## Módulo: Usuarios (`user/`)

### `UserServiceTest` — Gestión de usuarios

Verifica la creación de usuarios con hash de contraseña BCrypt, la activación/desactivación de cuentas, y la búsqueda por email e ID.

---

## Módulo: Eventos compartidos (`shared/events/`)

### `AdminEventsControllerTest` — Seguridad del endpoint SSE

| Caso | Resultado esperado |
|------|-------------------|
| Endpoint `GET /api/admin/events` | Tiene la anotación `@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")` verificada vía reflexión |

### `AdminMutationInterceptorTest` — Interceptor de mutaciones de administrador

Verifica que el interceptor bloquea operaciones de escritura (POST, PUT, DELETE) cuando el período académico está en un estado que no permite modificaciones.

---

## Resumen por módulo

### Pruebas unitarias (existentes)

| Módulo | Clases | Áreas cubiertas |
|--------|--------|----------------|
| Autenticación | 6 | Login (form, servicio, adaptador), OAuth2, cookies, JWT, usuario actual, validación DTO |
| Períodos académicos | 2 | Controller MVC, normalización y validación de negocio |
| Cursos | 2 | Controller MVC, normalización de código/prerrequisitos, reglas de unicidad |
| Aulas | 2 | Controller MVC, validación de tipo y capacidad |
| Docentes | 2 | Controller MVC, normalización y deduplicación de disponibilidad |
| Estudiantes | 2 | Controller MVC, normalización de datos |
| Recuperación de contraseña | 3 | Controller MVC, validación DTO, flujo OTP completo |
| Construcción de horarios | 2 | Controller MVC, validación de disponibilidad y conflictos |
| Generación de horarios | 1 | Rate limiting, delegación al solver |
| Tokens y sesiones | 3 | Creación, rotación, revocación; limpieza programada; gestión de sesiones |
| Perfil | 1 | Upsert y consulta de perfil |
| Usuarios | 1 | Creación con hash, activación/desactivación |
| Eventos compartidos | 2 | Seguridad SSE, interceptor de mutaciones |
| **Subtotal** | **32** | Toda la capa de servicios y controladores |

---

## Pruebas de Integración

**Estrategia** —
- Se mockea **solo la capa de infraestructura** (puertos de salida: DB, Redis, SMTP, solver)
- Se deja **real** todo lo demás: Spring Security, servicios, controladores, validación Bean
- No se levanta servidor HTTP — MockMvc simula las requests

**Framework:** `@SpringBootTest(webEnvironment = MOCK)` + `@AutoConfigureMockMvc`  
**Ubicación:** `Backend/horarios_api/src/test/java/online/horarios_api/*/integration/`

---

### Clase base: `IntegrationTest`

Declara todos los `@MockitoBean` de los puertos de salida (27 puertos) y la infraestructura Redis. Las subclases heredan los mocks y pueden configurarlos con `when(...).thenReturn(...)`.

### `JwtTestHelper`

Genera JWTs firmados con la clave de prueba (`test_secret_for_test_integration`, 32 bytes) usando el mismo algoritmo HMAC-SHA256 del backend. Los tokens se envían como cookie `access_token` en cada request autenticada.

---

### `AuthFlowIntegrationTest` — Flujo de autenticación

| Caso | Qué prueba que las unitarias NO prueban |
|------|----------------------------------------|
| Login válido → 200, cookies en response | Wiring real entre `AuthController` → `AuthService` → mocks de puertos |
| Login con email externo → 400 | Bean Validation en el contexto Spring completo (no standaloneSetup) |
| GET `/api/auth/me` sin cookie → **401 desde Spring Security** | La cadena de filtros JWT rechaza antes de llegar al controller |
| GET `/api/auth/me` con JWT válido → 200 | `CookieBearerTokenResolver` lee la cookie, el decoder valida el JWT firmado |
| GET `/api/auth/me` con JWT malformado → 401 | Validación de firma por el `JwtDecoder` real |
| POST `/api/auth/logout` sin cookie → 401 | Spring Security protege el endpoint antes del controller |
| POST `/api/auth/logout` con JWT válido → 204 | El servicio invoca el puerto de revocación |

---

### `CourseApiIntegrationTest` — API de cursos

| Caso | Qué prueba |
|------|------------|
| GET sin auth → 401 | Spring Security bloquea antes del controller |
| GET con rol STUDENT → **403 desde `@PreAuthorize`** | El método de autorización real con el token real |
| GET con rol TEACHER → 403 | Rol no tiene acceso al endpoint de admin |
| GET con rol ADMIN → 200 con datos | Wiring real Controller → Service → `coursePort` mockeado |
| POST con payload inválido → 400 | Bean Validation en contexto real |
| POST con payload válido → 200 | Creación real a través del servicio con mock del puerto |
| GET search con COORDINATOR → 403 | Endpoint solo acepta ADMIN |
| GET search con ADMIN → 200 | Búsqueda paginada a través del servicio |

---

### `PasswordResetFlowIntegrationTest` — Flujo OTP de 3 pasos

| Paso | Caso | Qué prueba |
|------|------|------------|
| 1 — requestOtp | Email institucional → 200 | Flujo completo: `userReadPort` → rate limit → `otpGeneratorPort` → `passwordHasherPort` → `passwordResetTokenPort.save` |
| 1 — requestOtp | Email externo → 400 | Bean Validation del `@Email` institucional |
| 1 — requestOtp | Email vacío → 400 | Bean Validation del campo requerido |
| 2 — verifyOtp | OTP correcto → 200 con `resetToken` | Flujo: busca token activo → verifica hash OTP → genera reset token |
| 2 — verifyOtp | OTP con formato inválido → 400 | Validación DTO del OTP |
| 3 — resetPassword | Token válido + contraseña fuerte → 200 | Flujo: hash del reset token → busca token verificado → cambia contraseña |
| 3 — resetPassword | Token vacío → 400 | Bean Validation del token requerido |

---

### `SchedulingSecurityIntegrationTest` — Seguridad por roles en scheduling

| Caso | Qué prueba |
|------|------------|
| GET time-slots sin auth → 401 | Filtro de seguridad rechaza antes del controller |
| GET time-slots con STUDENT → 403 | `@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")` con token real |
| GET time-slots con ADMIN → 200 | Acceso correcto, devuelve franjas del repositorio mockeado |
| GET time-slots con COORDINATOR → 200 | Ambos roles tienen acceso al endpoint |
| POST /generations sin auth → 401 | Seguridad en endpoint de generación |
| POST /generations con TEACHER → 403 | Solo ADMIN/COORDINATOR pueden generar |
| POST /generations con ADMIN, payload inválido → 400 | Validación del payload antes de llamar al solver |
| GET /options con STUDENT → 403 | Restricción de rol en opciones de horario |
| GET /options con ADMIN → 200 | Acceso correcto con período válido |

---

### Resumen total

| Tipo | Clases | Tests aprox. |
|------|--------|-------------|
| Unitarias | 32 | ~100 |
| Integración | 4 | ~30 |
| **Total** | **36** | **~130** |
