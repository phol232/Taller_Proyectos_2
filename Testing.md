# Testing — Documentación de Pruebas

Este documento describe todas las pruebas implementadas en el proyecto, organizadas por capa: **Frontend**, **Backend** y **Solver**. Incluye el framework utilizado, qué cubre cada archivo, los casos de prueba individuales y cómo ejecutar las suites.

---

## Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Frontend — Vitest](#frontend--vitest)
3. [Backend — JUnit 5 + Mockito](#backend--junit-5--mockito)
4. [Solver — pytest](#solver--pytest)
5. [Pipeline CI/CD](#pipeline-cicd)

---

## Resumen General

| Capa     | Framework         | Archivos | Tests aprox. | Umbral de cobertura |
|----------|-------------------|----------|--------------|---------------------|
| Frontend | Vitest            | 8        | ~70          | 70 % (líneas, ramas, funciones, sentencias) |
| Backend  | JUnit 5 + Mockito | 28       | ~110         | Sin umbral definido |
| Solver   | pytest            | 2        | ~70          | Sin umbral definido |
| **Total**| 3 frameworks      | **38**   | **~250**     | —                   |

---

## Frontend — Vitest

### Configuración

- **Framework:** Vitest
- **Archivo de configuración:** [frontend/vitest.config.ts](frontend/vitest.config.ts)
- **Setup global:** [frontend/tests/setup.ts](frontend/tests/setup.ts)
- **Directorio de tests:** [frontend/tests/unit/](frontend/tests/unit/)
- **Umbral de cobertura:** 70 % en líneas, ramas, funciones y sentencias
- **Áreas cubiertas por cobertura:** `lib/schedule/**`, `lib/validators/**`, `hooks/**`, `store/**`

### Comandos

```bash
# Ejecutar tests (modo CI, una sola pasada)
pnpm test

# Modo watch durante desarrollo
pnpm test:watch

# Reporte de cobertura
pnpm test:coverage
```

---

### `utils.test.ts`

**Archivo:** [frontend/tests/unit/utils.test.ts](frontend/tests/unit/utils.test.ts)  
**Módulo bajo prueba:** `@/lib/utils`  
**Qué cubre:** Utilidades transversales usadas en toda la app (clases CSS y notificaciones toast).

| Caso de prueba | Descripción |
|----------------|-------------|
| `cn()` — combina clases correctamente | Verifica que clases separadas se unan en un solo string |
| `cn()` — resuelve conflictos Tailwind (el último gana) | El último valor prevalece cuando hay clases en conflicto |
| `cn()` — omite valores falsy | Ignora `null`, `undefined` y `false` |
| `cn()` — acepta clases condicionales con objeto | Soporta la sintaxis `{ 'clase': condicion }` |
| `toastError()` — título y duración correctos | Llama a `toast.error` con los parámetros esperados |
| `toastError()` — pasa descripción cuando se provee | La descripción opcional aparece en el toast |
| `toastSuccess()` — título y duración correctos | Llama a `toast.success` con los parámetros esperados |
| `toastSuccess()` — pasa descripción cuando se provee | La descripción opcional aparece en el toast |

---

### `overlap.test.ts`

**Archivo:** [frontend/tests/unit/overlap.test.ts](frontend/tests/unit/overlap.test.ts)  
**Módulo bajo prueba:** `@/lib/schedule/overlap`  
**Qué cubre:** Detección de solapamientos de horario para la vista de horario del estudiante.

| Caso de prueba | Descripción |
|----------------|-------------|
| `timeSlotsOverlap` — detecta solapamiento total | Dos franjas idénticas se consideran solapadas |
| `timeSlotsOverlap` — detecta solapamiento parcial | Una franja que empieza dentro de otra es detectada |
| `timeSlotsOverlap` — no detecta conflicto en días distintos | El mismo horario en días diferentes no choca |
| `timeSlotsOverlap` — no detecta conflicto en franjas contiguas | Una franja que termina justo cuando empieza la otra es válida |
| `timeSlotsOverlap` — no detecta conflicto en franjas separadas | Franjas con gap entre ellas son válidas |
| `findTeacherOverlaps` — sin solapamiento cuando no hay conflicto | Asignaciones en distintos horarios no generan conflicto |
| `findTeacherOverlaps` — detecta solapamiento del mismo docente | Un docente asignado dos veces en el mismo slot es detectado |
| `findTeacherOverlaps` — no detecta conflicto entre docentes distintos | Dos docentes distintos en el mismo horario no es conflicto |

---

### `formValidation.test.ts`

**Archivo:** [frontend/tests/unit/formValidation.test.ts](frontend/tests/unit/formValidation.test.ts)  
**Módulo bajo prueba:** Lógica de validación extraída de las páginas de login y recuperación de contraseña  
**Qué cubre:** Validaciones de formularios del flujo de autenticación.

#### `validateLoginForm()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Email vacío → error requerido | Campo vacío produce error de campo obligatorio |
| Email con dominio externo → error de dominio | Solo se acepta `@continental.edu.pe` |
| Email con dominio parcial `@continental.edu` → error | Subdominios incompletos son rechazados |
| Email institucional correcto → sin error de email | Email válido no produce error |
| Password vacío → error requerido | Contraseña vacía produce error |
| Credenciales válidas → sin errores | Formulario completo y correcto pasa sin errores |
| Ambos campos vacíos → dos errores | Se reportan errores para email y password simultáneamente |

#### `validateForgotEmail()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Email vacío → error requerido | Campo vacío produce error |
| Dominio externo → error de dominio | Rechaza correos no institucionales |
| Email institucional → sin error | Correo válido pasa la validación |

#### `validateNewPassword()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Contraseña menor a 8 chars → error | Mínimo de 8 caracteres requerido |
| Contraseñas que no coinciden → error en confirmError | Confirmación diferente produce error |
| Contraseñas que coinciden y son válidas → sin errores | Caso feliz pasa sin errores |
| Contraseña sin complejidad requerida → error | Requiere mayúscula, minúscula, dígito y símbolo |
| Contraseña con `_` y `#` → válida | Caracteres especiales permitidos son aceptados |
| Contraseña con espacio → error específico | Los espacios producen un error dedicado |
| Contraseña vacía → error de longitud | Campo vacío activa el error de longitud mínima |
| Contraseñas no coinciden aunque ambas son válidas | La coincidencia se verifica aunque cada una sea válida individualmente |

---

### `api.interceptor.test.ts`

**Archivo:** [frontend/tests/unit/api.interceptor.test.ts](frontend/tests/unit/api.interceptor.test.ts)  
**Módulo bajo prueba:** Interceptor de respuesta Axios en `@/lib/api`  
**Qué cubre:** Manejo automático de errores HTTP y renovación de sesión.

| Caso de prueba | Descripción |
|----------------|-------------|
| `401` desde `/api/auth/login` → no abre recuperación | Los errores 401 en login no disparan recuperación automática |
| `401` desde `/api/auth/password-reset/verify` → no abre recuperación | Endpoints de OTP tampoco disparan recuperación |
| `401` desde endpoint protegido → abre recuperación | Se abre el diálogo de sesión expirada sin redirigir inmediatamente |
| `401` desde `/api/auth/refresh` → limpia sesión y redirige | El fallo del refresh redirige al login y limpia el estado |
| Restaura sesión y reintenta la request original | Tras recuperar la sesión la request original se reintenta |
| Varios `401` usan un solo refresh y reintentan todas | Las requests en cola esperan un único ciclo de refresh |
| Si refresh falla, rechaza requests pendientes y limpia la cola | Fallo de refresh propaga el error a todas las requests en espera |
| `403` → muestra toast "Sin permisos" | Forbidden produce una notificación de usuario apropiada |
| `409` → muestra toast "Conflicto de recurso" | Conflict produce su notificación |
| `500` → muestra toast "Error del servidor" | Error interno del servidor notifica al usuario |
| Error sin response → muestra toast "Error de conexión" | Errores de red (sin respuesta HTTP) son manejados |

---

### `adminSchemas.test.ts`

**Archivo:** [frontend/tests/unit/adminSchemas.test.ts](frontend/tests/unit/adminSchemas.test.ts)  
**Módulo bajo prueba:** `@/lib/validators/academic-period.schema` y `@/lib/adminApi`  
**Qué cubre:** Validación Zod del formulario de períodos académicos y extracción de errores de la API.

#### `academicPeriodSchema`

| Caso de prueba | Descripción |
|----------------|-------------|
| Acepta un período académico válido | Objeto con fechas y nombre correctos pasa la validación |
| Rechaza rangos inválidos | Fecha de fin anterior a la de inicio produce error Zod |

#### `getApiErrorMessage`

| Caso de prueba | Descripción |
|----------------|-------------|
| Prioriza el mensaje del backend | Cuando la respuesta contiene un mensaje de error, se usa ese |
| Usa el fallback cuando no hay detalles | Sin mensaje de backend se usa el texto de fallback provisto |

---

### `sessionExpiredDialog.test.tsx`

**Archivo:** [frontend/tests/unit/sessionExpiredDialog.test.tsx](frontend/tests/unit/sessionExpiredDialog.test.tsx)  
**Módulo bajo prueba:** `@/components/shared/SessionExpiredDialog`  
**Qué cubre:** Comportamiento del diálogo modal de sesión expirada.

| Caso de prueba | Descripción |
|----------------|-------------|
| Renderiza mensaje y acciones cuando la sesión expira | El diálogo aparece con las acciones correctas cuando el store lo indica |
| Restaura sesión desde el botón principal | El botón "Restaurar sesión" llama al endpoint de refresh y cierra el diálogo |
| Cierra sesión y redirige al login | El botón "Cerrar sesión" limpia el estado y redirige a `/login` |

---

### `credits.test.ts`

**Archivo:** [frontend/tests/unit/credits.test.ts](frontend/tests/unit/credits.test.ts)  
**Módulo bajo prueba:** `@/lib/schedule/credits`  
**Qué cubre:** Cálculo y validación de límite de créditos en la matrícula.

#### `sumCredits()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Suma correctamente los créditos de las asignaciones | Suma total de créditos de un conjunto de asignaciones |
| Maneja cursos sin créditos en el mapa (0 por defecto) | Cursos ausentes del mapa de créditos se tratan como 0 |
| Devuelve 0 para lista vacía | Sin asignaciones el total es 0 |

#### `exceedsLimit()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Devuelve `true` cuando se excede el límite | `exceedsLimit(18, 5, 22)` → true (18 + 5 = 23 > 22) |
| Devuelve `false` cuando se alcanza exactamente el límite | `exceedsLimit(17, 5, 22)` → false (17 + 5 = 22 = límite) |
| Devuelve `false` cuando queda espacio | `exceedsLimit(15, 4, 22)` → false (15 + 4 < 22) |

---

### `prerequisites.test.ts`

**Archivo:** [frontend/tests/unit/prerequisites.test.ts](frontend/tests/unit/prerequisites.test.ts)  
**Módulo bajo prueba:** `@/lib/schedule/prerequisites`  
**Qué cubre:** Verificación de prerrequisitos para la selección de cursos.

#### `getMissingPrerequisites()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Devuelve vacío cuando todos están aprobados | Sin prerrequisitos faltantes retorna lista vacía |
| Identifica los prerrequisitos faltantes | Lista solo los códigos no encontrados en aprobados |
| Devuelve todos si ninguno está aprobado | Con aprobados vacíos retorna todos los prerrequisitos |
| Devuelve vacío si el curso no tiene prerrequisitos | Cursos sin prerrequisitos siempre pasan |

#### `hasAllPrerequisites()`

| Caso de prueba | Descripción |
|----------------|-------------|
| Devuelve `true` cuando todos están aprobados | Todos los prerrequisitos cubiertos → true |
| Devuelve `false` cuando falta alguno | Al menos uno faltante → false |

---

## Backend — JUnit 5 + Mockito

### Configuración

- **Framework:** JUnit 5 con Mockito y Spring Boot Test
- **Directorio de tests:** [backend/horarios_api/src/test/java/online/horarios_api/](backend/horarios_api/src/test/java/online/horarios_api/)
- **Dependencias:** `spring-boot-starter-test`, `spring-security-test`
- **Herramienta de build:** Gradle

### Comandos

```bash
# Ejecutar todos los tests
cd backend/horarios_api
./gradlew test --no-daemon
```

### Estructura

Los tests se organizan en módulos que reflejan la arquitectura hexagonal del backend:

```
auth/          → Autenticación, JWT, OAuth2, cookies, sesiones
token/         → Refresh tokens, gestión de sesiones
academicperiod/ → Períodos académicos
course/        → Cursos y componentes
classroom/     → Aulas
teacher/       → Docentes
student/       → Estudiantes
user/          → Usuarios (OAuth2)
profile/       → Perfiles de usuario
passwordreset/ → Flujo de restablecimiento de contraseña
scheduling/    → Generación de horarios
```

---

### Módulo Auth

#### `AuthControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/controller/AuthControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/controller/AuthControllerTest.java)  
**Tipo:** Test MVC con MockMvc  
**Qué cubre:** Endpoint `POST /login` y su comportamiento ante distintas condiciones.

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| Credenciales válidas | `200 OK` con `AuthResponse` |
| Dominio de email inválido | `400 Bad Request` |
| Email vacío | `400 Bad Request` |
| Contraseña menor a 8 caracteres | `400 Bad Request` |
| Servicio lanza `401` | Propaga `401 Unauthorized` |
| Servicio lanza `403` | Propaga `403 Forbidden` |

#### `AuthServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/service/AuthServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/service/AuthServiceTest.java)  
**Tipo:** Test unitario con Mockito  
**Qué cubre:** Lógica de negocio de autenticación.

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `login` con credenciales válidas | Retorna `AuthResult` con tokens |
| `login` con credenciales inválidas | Propaga `UnauthorizedException` |
| `loginOAuth2` con usuario OAuth2 | Retorna `AuthResult` con tokens |
| `refresh` con token válido | Rota token y retorna nuevo `AuthResult` |
| `refresh` con token `null` | Lanza `UnauthorizedException` |
| `refresh` con token en blanco | Lanza `UnauthorizedException` |
| `refresh` con usuario no encontrado tras rotación | Lanza `UnauthorizedException` |
| `logout` | Revoca el refresh token |
| `logoutAll` | Revoca todos los tokens del usuario |

#### `AuthenticationAdapterTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/AuthenticationAdapterTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/AuthenticationAdapterTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `authenticate` con credenciales válidas | Retorna `UserInfo` |
| `authenticate` con credenciales inválidas | Lanza `UnauthorizedException` |

#### `JwtGeneratorAdapterTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/JwtGeneratorAdapterTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/JwtGeneratorAdapterTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `generateAccessToken` | Produce un JWT válido con los claims correctos (subject, roles, expiración) |

#### `OAuth2LoginSuccessHandlerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/OAuth2LoginSuccessHandlerTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/OAuth2LoginSuccessHandlerTest.java)  
**Tipo:** Test de integración del flujo OAuth2

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| Login OAuth2 exitoso | Setea cookies y redirige a `/callback` |
| Dominio no permitido | Redirige a `/login?error=domain_not_allowed` |
| Error inesperado | Redirige a `/login?error=oauth2_failed` |
| Principal no es `OidcUser` | Redirige a `/login?error=oauth2_failed` |
| `X-Forwarded-For` presente | Usa la primera IP como client IP |

#### `CookieServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/CookieServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/adapter/CookieServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `buildAccessTokenCookie` en modo `secure=true` | Cookie cross-site con `SameSite=None` |
| `buildRefreshTokenCookie` | Cookie con `Max-Age` igual al TTL del refresh token |
| `buildExpiredCookies` | Ambas cookies retornadas con `Max-Age=0` |
| `buildAccessTokenCookie` en modo `secure=false` | Usa `SameSite=Lax` y omite el flag `Secure` |

#### `LoginRequestValidationTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/dto/LoginRequestValidationTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/dto/LoginRequestValidationTest.java)  
**Tipo:** Test de validación Bean Validation

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| Email nulo | Violación `@NotBlank` |
| Email vacío | Violación `@NotBlank` |
| Email fuera del dominio | Violación `@Pattern` |
| Email con dominio institucional | Sin violaciones |
| Password nulo | Violación `@NotBlank` |
| Password menor a 8 caracteres | Violación `@Size` |
| Password mayor a 100 caracteres | Violación `@Size` |
| Credenciales válidas | Sin violaciones |

#### `CurrentUserServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/auth/service/CurrentUserServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/auth/service/CurrentUserServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `getCurrentUser` con usuario existente | Retorna `UserInfo` |
| `getCurrentUser` con usuario no encontrado | Lanza `UnauthorizedException` |

---

### Módulo Token / Sesiones

#### `SessionControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/token/controller/SessionControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/token/controller/SessionControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `GET /sessions` | Retorna lista de sesiones activas |
| `DELETE /sessions/{id}` | Revoca sesión y retorna `204 No Content` |

#### `RefreshTokenServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/token/service/RefreshTokenServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/token/service/RefreshTokenServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createRefreshToken` | Persiste token para el `userId` |
| `validateAndRotate` con token válido | Devuelve `userId` y revoca el token antiguo |
| `validateAndRotate` con token expirado | Lanza `UnauthorizedException` |
| `revokeSessionById` con usuario distinto | Lanza `ForbiddenException` |

#### `TokenCleanupSchedulerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/token/scheduler/TokenCleanupSchedulerTest.java](backend/horarios_api/src/test/java/online/horarios_api/token/scheduler/TokenCleanupSchedulerTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `cleanUpExpiredTokens` | Delega la limpieza al caso de uso correspondiente |

---

### Módulo Período Académico

#### `AcademicPeriodControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/academicperiod/controller/AcademicPeriodControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/academicperiod/controller/AcademicPeriodControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `POST /api/academic-periods` con payload inválido | `400 Bad Request` |
| `POST /api/academic-periods` con payload válido | `200 OK` |

#### `AcademicPeriodServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/academicperiod/service/AcademicPeriodServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/academicperiod/service/AcademicPeriodServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createAcademicPeriod` con datos válidos | Normaliza código y estado |
| `createAcademicPeriod` con fechas inválidas | Lanza `BadRequestException` |

---

### Módulo Curso

#### `CourseControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/course/controller/CourseControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/course/controller/CourseControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `GET /api/courses` | Retorna lista de cursos |
| `POST /api/courses` con payload inválido | `400 Bad Request` |
| `POST /api/courses` con payload válido | `200 OK` |

#### `CourseServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/course/service/CourseServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/course/service/CourseServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createCourse` con datos válidos | Normaliza código y elimina prerrequisitos duplicados |
| `createCourse` con curso como prerrequisito de sí mismo | Rechaza con error |
| `getCourse` con id inexistente | Lanza `NotFoundException` |

---

### Módulo Aula

#### `ClassroomControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/classroom/controller/ClassroomControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/classroom/controller/ClassroomControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `POST /api/classrooms` con payload inválido | `400 Bad Request` |
| `POST /api/classrooms` con payload válido | `200 OK` |

#### `ClassroomServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/classroom/service/ClassroomServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/classroom/service/ClassroomServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createClassroom` con datos válidos | Normaliza datos del aula |
| `createClassroom` con capacidad inválida | Lanza `BadRequestException` |

---

### Módulo Docente

#### `TeacherControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/teacher/controller/TeacherControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/teacher/controller/TeacherControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `POST /api/teachers` con payload inválido | `400 Bad Request` |
| `POST /api/teachers` con payload válido | `200 OK` |

#### `TeacherServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/teacher/service/TeacherServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/teacher/service/TeacherServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createTeacher` con datos válidos | Normaliza datos y elimina disponibilidad duplicada |
| `createTeacher` con franja inválida | Lanza `BadRequestException` |

---

### Módulo Estudiante

#### `StudentControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/student/controller/StudentControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/student/controller/StudentControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `POST /api/students` con payload inválido | `400 Bad Request` |
| `POST /api/students` con payload válido | `200 OK` |

#### `StudentServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/student/service/StudentServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/student/service/StudentServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `createStudent` con datos válidos | Normaliza códigos de cursos aprobados |
| `createStudent` con ciclo inválido | Lanza `BadRequestException` |

---

### Módulo Usuario / Perfil

#### `UserServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/user/service/UserServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/user/service/UserServiceTest.java)  
**Tipo:** Test unitario — Resolución OAuth2

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `findOrCreateOAuth2User` con dominio inválido | Lanza `BadRequestException` |
| `findOrCreateOAuth2User` con cuenta vinculada existente | Devuelve `UserInfo` sin crear nuevos registros |
| `findOrCreateOAuth2User` con usuario nuevo | Crea usuario student y vincula cuenta |
| `setUserStatus` desactivando usuario | Desactiva usuario y delega sincronización al puerto |

#### `ProfileServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/profile/service/ProfileServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/profile/service/ProfileServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `getProfile` sin perfil existente | Devuelve respuesta vacía |
| `upsertProfile` con datos válidos | Crea perfil y normaliza datos |
| `upsertProfile` con DNI duplicado | Lanza `DuplicateProfileFieldException` |

---

### Módulo Password Reset

#### `PasswordResetControllerTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/passwordreset/controller/PasswordResetControllerTest.java](backend/horarios_api/src/test/java/online/horarios_api/passwordreset/controller/PasswordResetControllerTest.java)  
**Tipo:** Test MVC

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `POST /request` con email válido | `200 OK` con mensaje genérico |
| `POST /request` con dominio inválido | `400` sin llamar al servicio |
| `POST /request` con email nulo | `400 Bad Request` |
| `POST /verify` con OTP correcto | `200 OK` con `resetToken` |
| `POST /verify` con OTP de 5 dígitos | `400` sin llamar al servicio |
| `POST /verify` con OTP incorrecto (servicio lanza 400) | `400 Bad Request` |
| `POST /verify` con máximo de intentos (servicio lanza 429) | `429 Too Many Requests` |
| `POST /reset` con token válido y contraseña | `200 OK` |
| `POST /reset` con contraseña menor a 8 chars | `400` sin llamar al servicio |
| `POST /reset` con token inválido (servicio lanza 400) | `400 Bad Request` |

#### `PasswordResetServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/passwordreset/service/PasswordResetServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/passwordreset/service/PasswordResetServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `requestOtp` con correo existente | Genera token y envía email |
| `requestOtp` con correo inexistente | Respuesta genérica sin revelar si existe o no |
| `requestOtp` con rate limit alcanzado | Respuesta genérica sin enviar email |
| `requestOtp` — OTP generado | Siempre es de 6 dígitos numéricos |
| `verifyOtp` con OTP correcto | Devuelve `resetToken` |
| `verifyOtp` con OTP incorrecto | Lanza `BadRequestException` |
| `verifyOtp` sin token activo | Lanza `BadRequestException` |
| `verifyOtp` con máximo de intentos superado | Lanza `TooManyRequestsException` y marca token como usado |
| `resetPassword` con token válido | Actualiza contraseña y marca token como usado |
| `resetPassword` con token inválido o expirado | Lanza `BadRequestException` |

#### `PasswordResetDtoValidationTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/passwordreset/dto/PasswordResetDtoValidationTest.java](backend/horarios_api/src/test/java/online/horarios_api/passwordreset/dto/PasswordResetDtoValidationTest.java)  
**Tipo:** Test Bean Validation

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `ForgotPasswordRequest` con email nulo | Falla validación |
| `ForgotPasswordRequest` con dominio inválido | Falla validación |
| `ForgotPasswordRequest` con dominio institucional | Válido |
| `VerifyOtpRequest` con OTP nulo | Falla validación |
| `VerifyOtpRequest` con OTP de formato inválido | Falla validación |
| `VerifyOtpRequest` con OTP de 6 dígitos | Válido |
| `ResetPasswordRequest` con token nulo | Falla validación |
| `ResetPasswordRequest` con contraseña < 8 chars | Falla validación |
| `ResetPasswordRequest` con contraseña sin complejidad | Falla validación |
| `ResetPasswordRequest` con contraseña con espacio | Falla con mensaje específico |
| `ResetPasswordRequest` con contraseña con símbolos variados | Válida |
| `ResetPasswordRequest` con datos completos válidos | Sin violaciones |

---

### Módulo Scheduling

#### `ScheduleGenerationServiceTest.java`

**Archivo:** [backend/horarios_api/src/test/java/online/horarios_api/scheduling/service/ScheduleGenerationServiceTest.java](backend/horarios_api/src/test/java/online/horarios_api/scheduling/service/ScheduleGenerationServiceTest.java)  
**Tipo:** Test unitario

| Caso de prueba | Resultado esperado |
|----------------|--------------------|
| `generateOption` con reserva aceptada | Llama al solver con el actor real y crea la reserva |
| `generateOption` con reserva rechazada | Lanza `429 Too Many Requests` con `retryAfter` y `remaining` |

---

## Solver — pytest

El solver es un microservicio Python (FastAPI) que implementa un CSP (Constraint Satisfaction Problem) para la generación automática de horarios. Sus tests se dividen en **unitarios** (sin base de datos) e **integración** (con base de datos real).

### Restricciones del dominio cubiertas

| Código | Restricción |
|--------|-------------|
| H1  | Sin solapamiento de docente |
| H2  | Sin solapamiento de aula |
| H3  | Disponibilidad del docente |
| H4  | Disponibilidad del aula |
| H5  | Compatibilidad aula-componente (tipo de sala + cursos autorizados) |
| H6  | Competencia del docente por componente |
| H7  | Horas exactas por componente |
| H9  | Tiempo de traslado del docente entre edificios |
| H10 | Prerrequisitos aprobados |
| H11 | Límite de créditos por período |
| H12 | Vacantes por oferta |
| H13 | Turno del estudiante |
| H14 | Curso compuesto indivisible |
| H15 | Corequisitos |

### Comandos

```bash
# Solo tests unitarios (sin BD requerida — usados en CI)
python -m pytest tests/test_components.py -v

# Solo tests de integración (requiere container planner-db activo)
python -m pytest tests/test_integration.py -v

# Filtrar por marcador
python -m pytest -m integration -v
python -m pytest -m "not integration" -v
```

---

### `test_components.py` — Tests Unitarios

**Archivo:** [solver/tests/test_components.py](solver/tests/test_components.py)  
**Framework:** pytest (sin base de datos)  
**Qué cubre:** Todos los componentes del solver en aislamiento, usando datos construidos en memoria.

#### VacancyTracker (H12)

| Función de test | Descripción |
|-----------------|-------------|
| `test_vacancy_tracker_reserve_release` | Verifica ciclo completo: libre, reservar, liberar. Capacidad llena bloquea reserva |

#### CorequisiteGrouper (H14, H15)

| Función de test | Descripción |
|-----------------|-------------|
| `test_corequisite_grouper_components` | Agrupa correctamente componentes con corequisitos en una unidad atómica |

#### ShiftFilter (H13)

| Función de test | Descripción |
|-----------------|-------------|
| `test_shift_filter_morning_only` | Estudiante de turno mañana solo accede a franjas de turno mañana |

#### TravelTimeChecker (H9)

| Función de test | Descripción |
|-----------------|-------------|
| `test_travel_time_blocks_consecutive_far_buildings` | Detecta violación cuando no hay tiempo suficiente para trasladarse entre edificios lejanos |
| `test_travel_time_allows_when_gap_sufficient` | Permite asignación cuando el gap es suficiente para el traslado |

#### DemandProjector

| Función de test | Descripción |
|-----------------|-------------|
| `test_demand_projector_falls_back_to_one` | Cuando no hay demanda calculada, el fallback es 1 aula |
| `test_restrict_classrooms_filters_courses_components_and_relations` | El scope restringido filtra cursos, componentes y relaciones correctamente |
| `test_selected_classroom_scope_ignores_external_unassignable_course` | Cursos sin aulas asignables son ignorados en el scope |
| `test_demand_projector_calculates_n_classrooms` | Calcula correctamente el número de aulas necesarias por componente |
| `test_demand_projector_no_compatible_classroom_falls_back` | Sin aulas compatibles, hace fallback a 1 |

#### ConstraintValidator — H1 (Sin solapamiento de docente)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h1_teacher_double_booked_detected` | Detecta docente asignado a dos cursos en el mismo slot |
| `test_h1_teacher_consecutive_different_slots_no_conflict` | Slots consecutivos distintos no generan conflicto |
| `test_h1_multi_block_single_offer_no_self_overlap` | Un bloque multi-slot de una misma oferta no se solapa consigo mismo |

#### ConstraintValidator — H2 (Sin solapamiento de aula)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h2_classroom_double_booked_detected` | Detecta aula asignada a dos ofertas en el mismo slot |

#### ConstraintValidator — H3 y H4 (Disponibilidad)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h3_teacher_unavailable_detected` | Detecta docente asignado en franja en que no está disponible |
| `test_h4_classroom_unavailable_detected` | Detecta aula asignada en franja en que no está disponible |

#### ConstraintValidator — H5 (Compatibilidad aula-componente)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h5_room_type_mismatch_detected` | El tipo de sala no corresponde al componente (ej. laboratorio en aula teórica) |
| `test_h5_classroom_not_authorized_for_course` | El aula no está autorizada para ese curso específico |

#### ConstraintValidator — H6 (Competencia docente)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h6_teacher_not_competent_detected` | Docente sin competencia en el componente es detectado |

#### ConstraintValidator — H7 (Horas exactas)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h7_wrong_number_of_slots_detected` | Número de bloques asignados no coincide con horas requeridas |
| `test_h7_correct_slots_no_hours_conflict` | Número correcto de bloques no genera conflicto |
| `test_h7_multiblock_component_split_across_days_detected` | Componente multi-bloque dividido entre días diferentes es detectado |

#### ConstraintValidator — H9 (Tiempo de traslado)

| Función de test | Descripción |
|-----------------|-------------|
| `test_h9_travel_time_violation_detected_by_validator` | El validator detecta violación de tiempo de traslado entre aulas de edificios distintos |

#### Demanda con restricciones de estudiantes — H10, H11

| Función de test | Descripción |
|-----------------|-------------|
| `test_h10_demand_respects_prerequisites` | Estudiantes sin prerrequisitos aprobados no generan demanda |
| `test_h10_already_approved_not_eligible` | Cursos ya aprobados no generan demanda |
| `test_h11_credit_limit_constrains_demand` | Estudiantes que alcanzarían el límite de créditos no son contados en la demanda |

#### VacancyTracker avanzado — H12

| Función de test | Descripción |
|-----------------|-------------|
| `test_h12_vacancy_full_offer_not_reservable` | Oferta sin vacantes no puede ser reservada |
| `test_h12_reserve_release_cycle` | Ciclo completo de reserva y liberación funciona correctamente |
| `test_h12_vacancy_tracker_groups_by_course` | Agrupa correctamente ofertas por curso |
| `test_h12_vacancy_tracker_groups_by_component` | Agrupa correctamente ofertas por componente |

#### ShiftFilter — H13

| Función de test | Descripción |
|-----------------|-------------|
| `test_h13_slot_in_correct_shift` | Slot en el turno correcto del estudiante es aceptado |
| `test_h13_flexible_shift_accepts_any` | Estudiantes de turno flexible aceptan cualquier franja |
| `test_h13_adjacent_shifts_order` | El orden de detección de turnos adyacentes es correcto |

#### CorequisiteGrouper — H14

| Función de test | Descripción |
|-----------------|-------------|
| `test_h14_compound_course_components_all_or_nothing` | Todos los componentes de un curso compuesto se matriculan o ninguno |

#### CorequisiteGrouper — H15

| Función de test | Descripción |
|-----------------|-------------|
| `test_h15_corequisite_group_forms_single_atomic_unit` | Corequisitos forman una unidad de matrícula indivisible |
| `test_h15_independent_course_stays_singleton` | Curso sin corequisitos permanece como singleton |
| `test_h15_corequisite_partial_overlap` | Solapamiento parcial de corequisitos se resuelve correctamente |

#### SolverInput

| Función de test | Descripción |
|-----------------|-------------|
| `test_solver_input_classroom_course_components_field` | El campo `classroom_course_components` está presente y es correcto |

#### TeacherScheduleSolver (Fase 1)

| Función de test | Descripción |
|-----------------|-------------|
| `test_teacher_solver_finds_valid_assignment` | Solver encuentra asignación válida en escenario básico |
| `test_teacher_solver_seed_varies_tied_candidates` | Diferentes seeds producen variación en candidatos empatados |
| `test_teacher_solver_rejects_split_multiblock_assignment` | Rechaza asignación donde bloques multi-slot se dividen en días distintos |
| `test_teacher_solver_fails_without_available_slots` | Falla correctamente cuando no hay slots disponibles |
| `test_teacher_solver_fails_without_competent_teacher` | Falla correctamente cuando no hay docente competente |

---

### `test_integration.py` — Tests de Integración

**Archivo:** [solver/tests/test_integration.py](solver/tests/test_integration.py)  
**Framework:** pytest con marcador `@pytest.mark.integration`  
**Requisito:** Container Docker `planner-db` activo con base de datos `horarios_db_prueba`  
**Qué cubre:** El solver completo contra datos reales de la base de datos.

#### Fixtures

| Fixture | Descripción |
|---------|-------------|
| `loaded_data` | `SolverInput` cargado desde la BD real sin estudiantes |
| `loaded_data_with_students` | `SolverInput` cargado desde la BD real incluyendo estudiantes |

#### Tests de Loader (SolverInputLoader)

| Función de test | Descripción |
|-----------------|-------------|
| `test_loader_carga_cursos` | BD contiene al menos un curso cargado |
| `test_loader_carga_componentes` | BD contiene componentes con campos requeridos |
| `test_loader_componentes_tienen_tipo_valido` | Todos los componentes tienen tipo `THEORY`, `PRACTICE` o `GENERAL` |
| `test_loader_no_mezcla_general_con_theory_practice` | Un curso no mezcla componentes `GENERAL` con `THEORY`/`PRACTICE` |
| `test_loader_carga_docentes` | BD contiene al menos un docente |
| `test_loader_carga_aulas` | BD contiene al menos un aula |
| `test_loader_carga_time_slots` | BD contiene time slots disponibles |
| `test_loader_teacher_course_components_referencia_componentes` | Las referencias docente→componente apuntan a componentes existentes |
| `test_loader_classroom_courses_referencia_cursos` | Las referencias aula→curso apuntan a cursos existentes |
| `test_loader_classroom_course_components_referencia_componentes` | Las referencias aula→componente apuntan a componentes existentes |
| `test_loader_teacher_availability_referencia_docentes_y_slots` | Disponibilidad docente referencia docentes y slots existentes |
| `test_loader_classroom_availability_referencia_aulas_y_slots` | Disponibilidad aula referencia aulas y slots existentes |
| `test_loader_period_max_credits_positivo` | El máximo de créditos del período es positivo |

#### Tests de DemandProjector con datos reales

| Función de test | Descripción |
|-----------------|-------------|
| `test_demand_projector_produce_entrada_por_componente` | Genera al menos una entrada de demanda por componente |
| `test_demand_projector_n_classrooms_es_positivo` | El número de aulas proyectadas es positivo para cada componente |
| `test_demand_projector_course_id_correcto` | El `course_id` en la demanda referencia cursos existentes |

#### Tests de ConstraintValidator con datos reales

| Función de test | Descripción |
|-----------------|-------------|
| `test_constraint_validator_acepta_asignacion_valida` | Construye una asignación realista con UUIDs reales y el validator la acepta sin conflictos |

#### Tests de TeacherScheduleSolver con datos reales

| Función de test | Descripción |
|-----------------|-------------|
| `test_teacher_solver_corre_sin_reventar_con_datos_reales` | El solver completa su ejecución sin excepciones |
| `test_teacher_solver_offers_respetan_h7` | Todas las ofertas generadas tienen el número exacto de bloques requeridos (H7) |
| `test_teacher_solver_offers_respetan_h1_h2` | Ningún docente ni aula aparece dos veces en el mismo slot (H1, H2) |
| `test_teacher_solver_offers_respetan_h6` | Todo docente asignado tiene competencia en el componente (H6) |
| `test_teacher_solver_offers_respetan_h5` | El tipo de sala del aula es compatible con el componente (H5) |

---

## Pipeline CI/CD

**Archivo:** [.github/workflows/tests.yml](.github/workflows/tests.yml)  
**Trigger:** Push y Pull Request a las ramas `develop` y `main`

### Jobs

| Job | Runner | Herramienta | Comando |
|-----|--------|-------------|---------|
| `backend-tests` | ubuntu-latest | JDK 21 (Temurin) + Gradle | `./gradlew test --no-daemon` |
| `solver-tests` | ubuntu-latest | Python 3.11 | `python -m pytest tests/test_components.py -v` |
| `frontend-tests` | ubuntu-latest | Node.js 20 + pnpm 9 | `pnpm test` |

> **Nota:** Los tests de integración del solver (`test_integration.py`) **no se ejecutan en CI** ya que requieren un container de base de datos PostgreSQL. Solo se corren localmente con el container `planner-db` activo.

### Diagrama de flujo CI

```
Push / PR → develop / main
        │
        ├── backend-tests  (JUnit 5)
        ├── solver-tests   (pytest - solo unitarios)
        └── frontend-tests (Vitest)
```
