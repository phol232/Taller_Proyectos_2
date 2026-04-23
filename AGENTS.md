# AGENTS.md

> Lee este archivo completo antes de generar o modificar cualquier línea de código en este repositorio.

---

## Alcance

Este archivo aplica a todo el monorepo.

Si el trabajo toca `frontend/`, lee también `frontend/AGENTS.md` antes de editar código del frontend. Ese archivo contiene reglas más específicas de Next.js, TypeScript, testing y dominio UI.

---

## Resumen del proyecto

`Planner UC` es un sistema de generación y gestión de horarios académicos.

### Estructura principal

- `frontend/` → Next.js 16 + React 19 + TypeScript + Tailwind v4
- `backend/horarios_api/` → Java 21 + Spring Boot 4 + Gradle Kotlin DSL
- `database/` → esquema SQL, funciones PL/pgSQL, migraciones y triggers PostgreSQL
- `docs/` → documentación funcional, arquitectura, planeamiento y diseño del solver CSP

### Stack base

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript strict · pnpm |
| Backend | Java 21 · Spring Boot 4.0.5 · Gradle |
| Base de datos | PostgreSQL 16+ |
| Auth | Spring Security · JWT en cookies `httpOnly` · OAuth2 Google |
| Estado FE | Zustand · React Hook Form · Zod |
| UI FE | shadcn/ui · Tailwind CSS v4 |
| Infra local | Docker Compose |
| Solver CSP | FastAPI/Python pendiente; diseño documentado, no implementado |

---

## Punto de partida obligatorio

Antes de cambiar código:

1. Identifica qué capa estás tocando: `frontend`, `backend`, `database` o `docs`.
2. Revisa el archivo fuente de verdad más cercano:
   - frontend: `frontend/AGENTS.md`
   - backend: `backend/horarios_api/build.gradle.kts`, estructura de paquetes y controladores/ports existentes
   - database: `database/schema.sql` y `database/functions/`
   - solver: `docs/Planificación/Diseno_Microservicio_Solver_CSP.md`
3. No asumas módulos o endpoints inexistentes.

---

## Reglas absolutas

- `hibernate.ddl-auto=none`. Nunca cambies el esquema desde el ORM.
- Todo DDL y cambios de esquema van en `database/`.
- Toda operación de BD fuera de `auth` debe ejecutarse llamando funciones PL/pgSQL.
- No reimplementes en Java lógica que ya exista en SQL o PL/pgSQL.
- La capa `domain` no depende de `infrastructure` ni de frameworks.
- Los controllers no acceden directo a repositorios; pasan por puertos/casos de uso.
- Nunca devuelvas tokens en el body HTTP. Solo en cookies `httpOnly`.
- Nunca uses `localStorage` o `sessionStorage` para tokens.
- Nunca uses `allowedOrigins("*")` en CORS.
- Nunca hardcodees secrets, credenciales o URLs. Usa variables de entorno.
- En frontend no uses `any`. Usa `unknown` o tipados explícitos.
- En frontend no crees instancias Axios fuera de `frontend/lib/api.ts`.
- No generes código que asuma implementado el microservicio CSP; hoy solo existe su diseño.

---

## Backend

### Ubicación

- `backend/horarios_api/`

### Arquitectura esperada

Usa arquitectura hexagonal: `infrastructure -> application -> domain`.

Estructura esperada por módulo:

- `domain/model`
- `domain/port/in`
- `domain/port/out`
- `application/usecase`
- `application/dto`
- `infrastructure/in/web`
- `infrastructure/out/persistence`
- `infrastructure/out/security`

### Acceso a datos

- Regla general: `JdbcTemplate` o `@Query` nativo contra funciones PL/pgSQL.
- Excepción única: el módulo `auth` puede usar JPA para `users`, `refresh_tokens` y `oauth2_linked_accounts`.

### Comandos útiles

```bash
cd backend/horarios_api
./gradlew bootRun
./gradlew test
./gradlew test jacocoTestReport
```

---

## Frontend

### Ubicación

- `frontend/`

### Regla de lectura previa

Si el cambio toca cualquier archivo dentro de `frontend/`, lee primero `frontend/AGENTS.md`.

### Comandos útiles

```bash
cd frontend
pnpm dev
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

### Reglas críticas ya establecidas

- La única instancia Axios vive en `frontend/lib/api.ts`.
- La sesión real vive en cookies del backend, no en Zustand.
- Los stores Zustand solo manejan estado simple; la lógica va en hooks o `lib/`.
- Respeta App Router y patrones existentes del proyecto.

---

## Base de datos

### Ubicación

- `database/schema.sql`
- `database/functions/`
- `database/migrations/`
- `database/triggers/`

### Convenciones

- PostgreSQL 16+
- UUID con `gen_random_uuid()`
- `TIMESTAMPTZ` en tablas nuevas
- Índices explícitos para FKs, búsquedas frecuentes y constraints de unicidad
- No usar arrays o JSON para relaciones académicas que deben estar normalizadas

### Al modificar el esquema

1. Añade o ajusta SQL en `database/`.
2. Declara índices y constraints necesarios.
3. Crea o actualiza funciones PL/pgSQL.
4. Si afecta `auth`, sincroniza entidades JPA.
5. Si afecta el frontend, actualiza tipos en `frontend/types/`.

---

## Documentación

### Ubicación relevante

- `readme.md` → visión general del proyecto
- `docs/Revisiones/Revision_Arquitectura_Backend.md` → decisiones y revisión de backend
- `docs/Planificación/Diseno_Microservicio_Solver_CSP.md` → diseño objetivo del solver
- `docs/Planificación/Requerimientos_Funcionales_y_No_Funcionales.md` → restricciones funcionales

Usa `docs/` como referencia de negocio y arquitectura, pero valida siempre contra el código y SQL actuales antes de implementar.

---

## Entorno local

### Servicios esperados

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- API base: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- PostgreSQL: `localhost:5432`

### Docker Compose

En raíz del repo:

```bash
docker compose up --build
```

Servicios definidos:

- `db`
- `backend`
- `frontend`

---

## No asumir que existe

No generes código que dependa de que ya estén implementados estos módulos o capacidades:

- Microservicio FastAPI del solver CSP
- Pipeline CI/CD del frontend
- Multi-institución o multi-sede
- Cualquier endpoint o flujo no presente en el código actual

---

## Idioma y estilo

- Código fuente: inglés
- Comentarios internos: inglés
- Mensajes visibles al usuario: español, salvo que el módulo ya sea i18n
- Commits: convención `feat|fix|refactor|docs|test|chore`

---

## Mantenimiento de este archivo

Actualiza este `AGENTS.md` cuando cambie cualquiera de estos puntos:

- arquitectura del backend
- reglas globales de persistencia
- estructura del monorepo
- comandos de desarrollo o testing
- alcance real del solver CSP
