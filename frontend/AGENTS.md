# AGENTS.md

> Lee este archivo completo antes de generar o modificar cualquier línea de código.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21 · Spring Boot 4.0.5 · Gradle (Kotlin DSL) |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript strict · pnpm |
| Base de datos | PostgreSQL 16+ · esquema SQL manual (`database/schema.sql`) |
| Seguridad | Spring Security · JWT en cookies `httpOnly` · OAuth2 Google |
| Estado (FE) | Zustand · React Hook Form · Zod |
| HTTP (FE) | Axios — instancia única en `lib/api.ts` |
| UI (FE) | shadcn/ui · Tailwind CSS v4 · Sonner · next-themes |
| Solver CSP | FastAPI/Python — pendiente; diseño objetivo en `docs/Planificación/Diseno_Microservicio_Solver_CSP.md` |
| CI/CD | GitHub Actions → GHCR → Dokploy (solo backend) |

---

## Reglas absolutas

- `hibernate.ddl-auto=none`. Nunca cambies el esquema desde el ORM. Todo DDL va en `database/`.
- Toda operación de BD (salvo módulo `auth`) se ejecuta llamando funciones PL/pgSQL, nunca con ORM.
- Nunca reimplementes en Java lógica que ya existe en una función PL/pgSQL.
- Nunca devuelvas tokens en el body HTTP. Solo en cookies `httpOnly`.
- Nunca uses `localStorage` o `sessionStorage` para tokens.
- Nunca uses `allowedOrigins("*")` en CORS.
- Nunca hardcodees credenciales, URLs ni secrets. Todo en `.env`.
- La capa `domain` no importa nada de `infrastructure` ni de frameworks externos.
- Los controllers nunca acceden directamente a repositorios; siempre a través de puertos (interfaces).
- No uses `any` en TypeScript. Usa `unknown` o define la interfaz.
- No crees una instancia Axios fuera de `lib/api.ts`.
- No generes código que asuma módulos no implementados (ver [No existe todavía](#no-existe-todavía)).

---

## Dominio y roles

Solo se permiten emails `@continental.edu.pe` — en registro, login y OAuth2 Google. Si el proveedor retorna un email fuera del dominio, acceso denegado.

| Rol | Permisos |
|---|---|
| `ADMIN` | Gestión de usuarios, cursos, aulas, docentes. Supervisión global. |
| `COORDINATOR` | Generar/confirmar horarios. Asignar docentes a cursos. Ver disponibilidades. |
| `TEACHER` | Registrar disponibilidad. Ver horario asignado. |
| `STUDENT` | Seleccionar cursos. Ver horario generado. |

---

## Seguridad y autenticación

- **Access token:** 15 min (`JWT_ACCESS_EXP=900`). **Refresh token:** 7 días (`JWT_REFRESH_EXP=604800`).
- Tokens almacenados como hash SHA-256 en BD, nunca en texto plano.
- BCrypt para contraseñas y OTPs.
- Rotación de refresh tokens: cada uso invalida el anterior y emite un par nuevo.
- El frontend solo almacena info de display (no sensible) en Zustand. La sesión real vive en cookies del backend.
- Al emitir refresh tokens nuevos: registrar `ip_address` y `user_agent`.

**Flujo OTP de reseteo de contraseña:**
1. Usuario solicita OTP de 6 dígitos → enviado por email (Brevo SMTP).
2. Límite: 3 solicitudes por ventana de 15 min.
3. OTP almacenado como hash BCrypt. Máximo 5 intentos de verificación.
4. OTP verificado → se emite `reset_token` de un solo uso.
5. `reset_token` → permite cambiar la contraseña.

---

## Backend — Arquitectura Hexagonal (Ports & Adapters)

El flujo de dependencias es siempre hacia adentro: `infrastructure` → `application` → `domain`. La capa `domain` no conoce frameworks ni infraestructura. Los controllers nunca acceden directamente a repositorios; siempre a través de puertos (interfaces).

### Estructura de carpetas por módulo

```
<modulo>/
├── domain/
│   ├── model/           # Entidades de dominio puras — sin anotaciones JPA ni frameworks
│   └── port/
│       ├── in/          # Interfaces de casos de uso (inbound ports)
│       │                # Define qué puede pedirle el mundo exterior a este módulo
│       └── out/         # Interfaces de repositorios y servicios externos (outbound ports)
│                        # Define qué necesita el dominio del mundo exterior
├── application/
│   ├── usecase/         # Implementaciones de los casos de uso
│   │                    # Orquestan entidades de dominio y llaman a puertos out
│   └── dto/             # DTOs de entrada y salida — nunca exponer entidades de dominio directamente
└── infrastructure/
    ├── in/
    │   └── web/         # Controllers REST — reciben HTTP, validan con @Valid,
    │                    # llaman a puertos in, devuelven respuesta. Sin lógica de negocio.
    └── out/
        ├── persistence/ # Implementaciones de puertos out
        │                # Módulo auth: entidades JPA + JpaRepositories
        │                # Resto de módulos: JdbcTemplate / @Query nativo → funciones PL/pgSQL
        └── security/    # UserDetailsService, filtros JWT, adapters de seguridad
```

### Acceso a base de datos

**Regla general:** toda operación de BD se ejecuta llamando a funciones PL/pgSQL definidas en `database/schema.sql` via `JdbcTemplate` o `@Query` nativo.

**Excepción única — módulo `auth`:** usa Spring Data JPA / ORM para `users`, `refresh_tokens` y `oauth2_linked_accounts`. Ningún otro módulo usa ORM.

### Módulos y endpoints activos

| Módulo | Base path | Endpoints |
|---|---|---|
| `auth` | `/api/auth` | `POST /login`, `GET /me`, `POST /refresh`, `POST /logout`, `POST /logout-all` |
| `token` | `/api/sessions` | Gestión de sesiones activas |
| `user` | `/api/users` | Listado, búsqueda, consulta |
| `profile` | `/api/profile` | `GET /me`, `PUT /me` (upsert) |
| `passwordreset` | `/api/password-reset` | Flujo OTP completo |

### Naming conventions — Java

- Clases: `PascalCase` → `AuthService`, `JwtGeneratorAdapter`
- Métodos/variables: `camelCase` → `generateAccessToken()`
- Paquetes: `online.horarios_api.<modulo>.domain.model`
- DTOs: sufijo explícito → `LoginRequest`, `AuthResponse`
- Ports: sufijo `Port` → `UserReadPort`, `TokenRevokePort`
- Adapters: sufijo `Adapter` → `RefreshTokenRepositoryAdapter`

---

## Frontend — Next.js 16 App Router

> ⚠️ Next.js 16 tiene breaking changes respecto a versiones anteriores. Leer `node_modules/next/dist/docs/` antes de escribir cualquier código Next.js. Respetar deprecaciones.

### Estructura de carpetas

```
frontend/
├── app/
│   ├── (auth)/              # Rutas públicas: login/ · callback/ · forgot-password/
│   └── (app)/               # Rutas protegidas: settings/ · admin/ · coordinator/ · student/ · schedules/
├── components/
│   ├── ui/                  # Primitivos shadcn/ui — no modificar directamente
│   ├── shared/              # Componentes reutilizables entre features
│   ├── layout/              # Sidebar, header, wrappers de layout
│   └── schedule/            # Componentes específicos de horarios
├── store/
│   ├── auth.store.ts        # Usuario autenticado, rol, loading — NO almacena tokens
│   ├── schedule.store.ts    # Horario activo, cursos seleccionados, restricciones CSP
│   ├── notification.store.ts# Cola de toasts globales (success · error · info)
│   └── ui.store.ts          # Estado sidebar, tema dark/light, modales globales
├── lib/
│   ├── api.ts               # ← ÚNICA instancia Axios del proyecto
│   ├── profileApi.ts        # Llamadas a /api/profile
│   ├── validators/          # Esquemas Zod reutilizables (sufijo Schema)
│   ├── schedule/            # Lógica de negocio de horarios y CSP helpers
│   └── i18n/                # Internacionalización ES/EN — sin i18next
├── hooks/                   # Custom hooks — aquí va la lógica de negocio, no en stores
├── types/
│   ├── auth.ts              # User, JWTPayload, LoginCredentials
│   ├── entities.ts          # Role, Student, Teacher, Course, Classroom, TimeSlot
│   └── schedule.ts          # Tipos de horarios y restricciones CSP
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Stores Zustand

No pongas lógica de negocio en stores. Solo estado y setters simples. La lógica va en `hooks/` o `lib/`.

| Store | Responsabilidad |
|---|---|
| `auth.store.ts` | Usuario autenticado, rol, loading. La sesión real vive en cookies del backend. |
| `schedule.store.ts` | Horario activo, cursos seleccionados, restricciones CSP. |
| `notification.store.ts` | Cola de toasts (success · error · info). |
| `ui.store.ts` | Estado sidebar, tema dark/light, modales globales. |

### HTTP — Axios

`lib/api.ts` exporta la única instancia Axios del proyecto con `baseURL=NEXT_PUBLIC_API_URL`, `withCredentials: true` (obligatorio para enviar cookies `httpOnly`), e interceptor de respuesta que redirige a `/login` en 401 excepto en rutas de auth.

### Naming conventions — TypeScript

- Componentes: `PascalCase.tsx`
- Utilidades/hooks: `camelCase.ts`
- Tipos e interfaces: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Stores: `*.store.ts`
- Validadores Zod: `*Schema` → `loginSchema`, `profileSchema`

---

## Base de datos

Motor: PostgreSQL 16+ · Extensión requerida: `pgcrypto` · PKs: UUID (`gen_random_uuid()`) · Timestamps: `TIMESTAMPTZ` en todas las tablas.

### Dominio académico y solver CSP

- `users` y `profiles` se reutilizan; no dupliques identidad, email ni roles en tablas académicas.
- Para el dominio de horarios sí hacen falta tablas nuevas. El mínimo aprobado está documentado en `docs/Planificación/Diseno_Microservicio_Solver_CSP.md`.
- Como base, el modelo debe incluir: `academic_periods`, `time_slots`, `teachers`, `teacher_availability`, `students`, `student_completed_courses`, `classrooms`, `classroom_availability`, `courses`, `course_prerequisites`, `course_offerings`, `course_sections`, `section_teacher_candidates`, `teaching_schedules`, `section_assignments`, `section_assignment_slots`, `student_schedules`, `student_schedule_items`, `solver_runs`, `solver_run_conflicts`.
- No guardes prerrequisitos, cursos aprobados, disponibilidades ni bloques asignados como arrays o JSON. Deben ser relaciones normalizadas.
- El control de concurrencia para recursos de horario debe apoyarse en constraints e índices únicos en SQL, no solo en validaciones de aplicación.
- El horario docente confirmado del período es la fuente de verdad para construir horarios de estudiante.
- El solver FastAPI no debe duplicar autenticación ni perfiles; solo generación, validación y auditoría del proceso de scheduling.
- Si el microservicio FastAPI escribe en PostgreSQL, debe hacerlo con SQL explícito / funciones PL/pgSQL o SQLAlchemy Core; no con ORM que esconda reglas de persistencia.
- La generación docente debe tratarse como job asíncrono con `solver_runs`; la generación de propuesta del estudiante puede ser síncrona mientras cumpla el SLA de 5 segundos.
- El algoritmo objetivo del PMV es CSP con poda de dominio, MRV, LCV, forward checking y AC-3 opcional antes de intentar optimizaciones soft.

### Machine Learning para scheduling

- ML es complementario al CSP. Nunca reemplaza las hard constraints ni decide por sí solo si un horario es válido.
- El uso aprobado de ML en este proyecto es:
  - sugerir franjas con menor probabilidad de conflicto;
  - aprender preferencias históricas de estudiantes o coordinadores;
  - detectar patrones de horarios que suelen corregirse manualmente.
- Stack recomendado:
  - `pandas` para dataset y feature engineering;
  - `scikit-learn` para baseline;
  - `XGBoost` o `LightGBM` para producción del PMV+;
  - `SHAP` para explicabilidad.
- Si se implementa ML, su salida debe usarse solo como `score`, `ranking` o `soft penalty` dentro del solver.
- No usar ML para saltarse validaciones de prerrequisitos, vacantes, disponibilidad o solapamientos.
- No empezar con redes neuronales profundas, transformers, reinforcement learning ni modelos generativos para generar horarios completos.
- Antes de introducir ML en producción, registrar feedback y predicciones en tablas dedicadas. Ver diseño en `docs/Planificación/Diseno_Microservicio_Solver_CSP.md`.

### Convención de índices

Toda tabla nueva debe incluir índices explícitos definidos en `database/schema.sql`. Reglas:

- **FKs:** crear índice en toda columna de clave foránea.
- **Búsquedas frecuentes:** crear índice en columnas usadas habitualmente en `WHERE` o `JOIN`.
- **Índices parciales:** usar `WHERE <condicion>` cuando la mayoría de filas quedan excluidas — ej. `WHERE revoked = FALSE`, `WHERE is_active = TRUE`.
- **Unicidad:** declarar como constraint `UNIQUE`, no solo como índice.
- **Búsqueda de texto:** usar índice `GIN` con `pg_trgm` para `ILIKE` o `~*` (búsquedas case-insensitive).
- Nunca crear índices redundantes — una PK ya tiene índice implícito.

### Funciones PL/pgSQL

Llamar desde el backend con `JdbcTemplate` o `@Query` nativo. No reimplementar en Java.

| Función | Propósito |
|---|---|
| `fn_revoke_refresh_token(token_hash)` | Invalida un token específico |
| `fn_revoke_all_user_tokens(user_id)` | Logout global — todos los dispositivos |
| `fn_delete_all_expired_tokens()` | Limpieza programada (`TokenCleanupScheduler`) |
| `fn_invalidate_user_prt(user_id)` | Invalida tokens de reset de contraseña |
| `fn_deactivate_user(user_id)` | Soft delete |
| `fn_upsert_profile(user_id, ...)` | INSERT ... ON CONFLICT UPDATE |
| `fn_search_users_by_name(query)` | Búsqueda case-insensitive |

### Triggers activos

| Trigger | Efecto |
|---|---|
| `trg_users_updated_at` | Actualiza `updated_at` en `users` |
| `trg_profiles_updated_at` | Actualiza `updated_at` en `profiles` |

### Modificar el esquema

1. Añadir SQL en `database/` (nuevo archivo o sección en `schema.sql`).
2. Definir índices según las convenciones anteriores.
3. Crear/actualizar funciones PL/pgSQL para la operación.
4. Si el módulo afectado es `auth`: actualizar también las entidades JPA.
5. Actualizar tipos TypeScript en `frontend/types/` si el cambio afecta al frontend.

---

## Idioma del código

| Contexto | Idioma |
|---|---|
| Código fuente (variables, funciones, clases) | Inglés |
| Comentarios internos | Inglés |
| Mensajes de error visibles al usuario | Español (la app usa i18n ES/EN) |
| Commits | Prefijo convencional + español o inglés (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`) |

---

## Testing

### Backend — JUnit 5 · Mockito · Spring Boot Test · Jacoco

Cobertura objetivo: **≥ 70%** en módulos críticos (`auth`, `token`, `passwordreset`).

```bash
cd backend/horarios_api
./gradlew test
./gradlew test jacocoTestReport
```

**Unitarias** — clase aislada, sin contexto Spring:
- Mockear todas las dependencias con Mockito.
- Cubrir servicios, utilidades JWT, hasheado, validaciones de dominio.
- Ejemplos: `AuthServiceTest`, `JwtGeneratorTest`, `OtpHasherTest`.

**Integración** — contexto Spring parcial o completo:
- Controllers: `@WebMvcTest` + `MockMvc`. Mockear capa de servicio.
- Repositorios (solo módulo `auth`): `@DataJpaTest` + Testcontainers PostgreSQL.
- Mockear dependencias externas (SMTP, OAuth2) con Mockito o WireMock.
- Ejemplos: `AuthControllerTest`, `SessionControllerTest`, `PasswordResetFlowTest`.

**E2E backend** — contrato completo de la API contra instancia real:
- `@SpringBootTest(webEnvironment = RANDOM_PORT)` + Testcontainers (`postgres:16-alpine`).
- Probar flujos completos: registro → login → refresh → logout.
- Ejemplos: `AuthApiE2ETest`, `PasswordResetApiE2ETest`.

---

### Frontend — Vitest · React Testing Library · Playwright

```bash
cd frontend
pnpm test            # unitarias + integración (Vitest)
pnpm test:watch
pnpm test:coverage
pnpm test:e2e        # E2E (Playwright)
```

**Unitarias** — componentes y utilidades en aislamiento:
- Renderizar con `@testing-library/react` sin red ni router real.
- Mockear stores Zustand y llamadas Axios.
- Ejemplos: `FormField.test.tsx`, `formValidation.test.ts`, `credits.test.ts`, `overlap.test.ts`.

**Integración** — flujos de UI con múltiples componentes:
- Flujos completos de formularios (login, OTP, perfil) con interacciones reales de usuario.
- Mockear solo la capa HTTP (`lib/api.ts`) con MSW (Mock Service Worker).
- Verificar que los stores se actualicen correctamente tras las respuestas.
- Ejemplos: `LoginFlow.test.tsx`, `PasswordResetFlow.test.tsx`, `api.interceptor.test.ts`.

**E2E** — Playwright contra frontend y backend reales:
- Levantar frontend + backend + base de datos con Docker Compose antes de los tests.
- Probar flujos críticos completos: login email/password, login OAuth2, reseteo de contraseña, visualización de horario.
- Ejemplos: `login.spec.ts`, `password-reset.spec.ts`, `schedule-view.spec.ts`.

---

## Entornos y URLs locales

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8080/api` |
| Swagger UI | `http://localhost:8080/swagger-ui.html` |
| PostgreSQL | `localhost:5432` · DB: `horarios_db` |

Variables de entorno: ver `.env.example` en la raíz del proyecto.

---

## No existe todavía

No generes código que asuma implementados estos módulos:

- CRUD de cursos y aulas
- Selección de cursos por estudiantes
- Registro de disponibilidad de docentes
- **Implementación del motor CSP / microservicio FastAPI** (solo existe el diseño en `docs/Planificación/Diseno_Microservicio_Solver_CSP.md`)
- Pipeline CI/CD para el frontend
- Multi-institución o multi-sede

---

*Actualizar este archivo al añadir módulos, cambiar el esquema de BD o modificar patrones arquitectónicos.*
