# AGENTS.md — Backend (`backend/horarios_api/`)

> Lee este archivo completo antes de generar o modificar cualquier línea de código bajo `backend/horarios_api/`. Aplica encima de las reglas globales definidas en `AGENTS.md` de la raíz del monorepo.

---

## 1. Stack y versiones

| Capa | Tecnología |
|---|---|
| Lenguaje | Java 21 (toolchain configurado en `build.gradle.kts`) |
| Framework | Spring Boot 4.0.5 |
| Build tool | Gradle Kotlin DSL |
| Persistencia | PostgreSQL 16+ (`hibernate.ddl-auto=none`) |
| ORM | Spring Data JPA (solo módulo `auth`) |
| Acceso a datos general | `JdbcTemplate` o `@Query` nativo contra funciones PL/pgSQL |
| Seguridad | Spring Security + Resource Server JWT (Nimbus) |
| OAuth2 | `oauth2-client` (login Google) |
| Validación | `spring-boot-starter-validation` (Jakarta) |
| Documentación | `springdoc-openapi 3.0.2` |
| Logging AOP | `aspectjweaver` |
| Mail | `spring-boot-starter-mail` |
| Pub/Sub | `spring-boot-starter-data-redis` (Redis pub/sub para SSE multi-instancia) |
| Boilerplate | Lombok |
| Config externa | `me.paulschwarz:spring-dotenv:4.0.0` (lee `backend/horarios_api/.env`) |
| Tests | JUnit 5 (`useJUnitPlatform`) + `spring-security-test` |

No actualices versiones de manera oportunista. Ninguna actualización de dependencia entra sin justificación funcional o de seguridad.

---

## 2. Punto de partida obligatorio

Antes de tocar el backend:

1. Lee la raíz `AGENTS.md`.
2. Identifica si tu cambio es de `auth`, dominio académico (`course`, `academicperiod`, `student`, `teacher`, `classroom`, `schedule`, etc.) o cross-cutting (`config`, `aop`, `web`).
3. Revisa cómo está implementado un módulo similar (`course/`, `academicperiod/`) antes de inventar un patrón nuevo.
4. Revisa `database/schema.sql` y `database/functions/` si tu cambio toca datos.
5. Revisa `docs/Revisiones/Revision_Arquitectura_Backend.md` y `docs/Planificación/Requerimientos_Funcionales_y_No_Funcionales.md`.

No asumas módulos o endpoints que no existan en el código actual.

---

## 3. Arquitectura hexagonal (regla dura)

Cada módulo de negocio sigue exactamente esta estructura, observable en `course/`, `academicperiod/`, `auth/`, `token/`:

```
online/horarios_api/<modulo>/
├── domain/
│   ├── model/                 # Entidades de dominio puras (POJO/record). Sin Spring, sin JPA, sin Jakarta.
│   └── port/
│       ├── in/                # Interfaces de casos de uso (lo que el dominio expone).
│       └── out/               # Interfaces hacia el exterior (persistencia, mailing, http, etc.).
├── application/
│   ├── usecase/               # Implementaciones de los puertos `in`. Orquestan dominio + puertos `out`.
│   └── dto/                   # DTOs de entrada/salida del caso de uso (NO request/response HTTP).
└── infrastructure/
    ├── in/web/                # Controllers REST. Solo hablan con puertos `in`.
    ├── out/persistence/       # Adaptadores que implementan puertos `out` (JdbcTemplate, JPA en `auth`).
    ├── out/security/          # Adaptadores de seguridad (token signing, password hashing).
    ├── out/scheduler/         # Tareas programadas (`@Scheduled`).
    └── config/                # Configuración Spring específica del módulo.
```

### Reglas de dependencia

- `domain` no importa nada de `infrastructure` ni de `application`.
- `domain` no importa Spring, JPA, Jakarta, Lombok salvo `@Value`/`@Builder` en records simples.
- `application` depende solo de `domain`.
- `infrastructure` depende de `domain` y `application`. Nunca al revés.
- Los `controllers` (`infrastructure/in/web`) jamás tocan repositorios ni adapters directamente. Pasan por `domain/port/in`.
- Los `repositories`/`adapters` (`infrastructure/out/persistence`) implementan `domain/port/out`.

Si algún PR rompe esta dirección, se rechaza.

---

## 4. Acceso a datos

### 4.1 Regla general

Toda operación de BD fuera del módulo `auth` debe ejecutarse llamando funciones PL/pgSQL:

```java
jdbcTemplate.query(
    "SELECT * FROM fn_<dominio>_<accion>(?, ?, ?)",
    rowMapper,
    p1, p2, p3
);
```

Si la función PL/pgSQL no existe, no la inventes en Java: créala primero en `database/functions/<dominio>/` y agrégala al control de versiones.

### 4.2 Excepción `auth`

El módulo `auth` puede usar JPA exclusivamente para estas tablas:

- `users`
- `refresh_tokens`
- `oauth2_linked_accounts`

No extiendas esta excepción a otras tablas (estudiantes, cursos, profesores, etc.).

### 4.3 Reglas DDL

- `hibernate.ddl-auto=none` no se cambia.
- No mutes el esquema desde el ORM ni desde código Java.
- Todo cambio estructural va en `database/migrations/` con SQL idempotente.
- Si afecta a tablas que JPA maneja, sincroniza la entidad en `auth/.../persistence/`.

### 4.4 No reimplementar

No portees a Java lógica ya resuelta en SQL/PL/pgSQL. Llama la función.

---

## 5. Seguridad

### 5.1 JWT y cookies

- JWT viaja siempre en cookies `httpOnly` + `Secure` + `SameSite=Lax` (o `None` si lo amerita el flujo cross-site con HTTPS).
- Nunca devuelvas tokens en el body HTTP.
- Nunca aceptes tokens desde headers en flujos del navegador. Solo cookies.
- El refresh token vive en cookie `httpOnly` separada.

### 5.2 CORS

- Nunca uses `allowedOrigins("*")`.
- Define orígenes permitidos por entorno (`application-*.yml` o variables de entorno).
- `allowCredentials = true` debe ir acompañado de orígenes explícitos.

### 5.3 Secrets y configuración

- Nada de credenciales hardcodeadas.
- Usa `application.yml` + variables de entorno + `.env` (vía `spring-dotenv`).
- No commitees `.env` con valores reales. Solo `.env.example`.
- Llaves JWT, contraseñas SMTP, OAuth client secrets: solo por entorno.

### 5.4 OAuth2

- Solo flujo `authorization_code` para login Google.
- Nunca uses `implicit`.
- Después del login OAuth, emitir cookies internas de sesión propias y olvidar el token de Google.

### 5.5 Endpoints públicos

Whitelist explícita en `SecurityFilterChain`:
- `/auth/**` solo lo necesario (`/login`, `/register`, `/refresh`, `/logout`, `/oauth2/**`).
- `/swagger-ui/**`, `/v3/api-docs/**`, `/actuator/health` cuando aplique.
- Todo lo demás requiere autenticación.

### 5.6 Autorización

- Usa `@PreAuthorize` con roles explícitos (`ADMIN`, `COORDINATOR`, `TEACHER`, `STUDENT`).
- Mejor en la capa de caso de uso o controller, nunca en el repositorio.

---

## 6. Validación de entradas

- Todo DTO de request lleva validaciones Jakarta (`@NotBlank`, `@Email`, `@Size`, `@Positive`, etc.).
- Los controllers exponen `@Valid` en `@RequestBody`.
- Errores de validación se traducen a respuestas estándar (`400` con cuerpo JSON consistente).
- No confíes en validación del frontend. Repítela siempre en el backend.

---

## 7. Manejo de errores

- Centraliza con `@RestControllerAdvice`.
- Mapea excepciones de dominio a códigos HTTP claros:
  - 400: validación / dominio inválido.
  - 401: no autenticado.
  - 403: autenticado sin permisos.
  - 404: recurso no encontrado.
  - 409: conflicto (duplicado, estado inválido).
  - 422: regla de negocio.
  - 500: solo errores no esperados.
- Cuerpo de error consistente. Sugerido:

```json
{
  "timestamp": "...",
  "status": 422,
  "error": "BUSINESS_RULE_VIOLATION",
  "message": "...",
  "path": "/api/..."
}
```

- Nunca filtres stacktraces al cliente.

---

## 8. Logging y AOP

- `aspectjweaver` ya está incluido para timing/aspect logging.
- Logs en inglés, con nivel apropiado (`INFO` para acciones de negocio, `DEBUG` para diagnóstico, `WARN`/`ERROR` para anomalías).
- Nunca loguees:
  - tokens
  - contraseñas
  - PII completo (DNI, email completo, etc.)
- Usa SLF4J (`Logger log = LoggerFactory.getLogger(...)`) o `@Slf4j` de Lombok.

---

## 9. API REST

### 9.1 Convenciones

- Prefijo global: `/api`.
- Recursos en plural en kebab-case: `/api/courses`, `/api/academic-periods`.
- Verbos HTTP estándar (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`).
- Códigos de respuesta correctos. No retornes 200 con `success: false`.

### 9.2 OpenAPI

- Cada controller documenta sus endpoints con `@Operation`, `@ApiResponse`, etc.
- Cada DTO documenta sus campos con `@Schema`.
- Swagger UI en `http://localhost:8080/swagger-ui.html`.

### 9.3 Paginación y filtros

- Para listados grandes, paginación basada en cursor o offset, con respuestas estables (`{ items, total, page, size }`).
- Filtros como query params nombrados, no como mezcla en el path.

---

## 10. Solver CSP (microservicio externo)

- El microservicio CSP corre fuera de Spring Boot (Python/FastAPI, no incluido en este módulo).
- El backend invoca al solver vía HTTP REST y se suscribe a sus WebSockets cuando aplica.
- No reimplementes lógica de solver en Java.
- No accedas directamente a `solver_runs`, `solver_run_conflicts`, `course_schedule_assignments` y `student_schedule_items` para fines de generación. Solo lectura/visualización vía funciones PL/pgSQL del dominio.
- La URL del solver vive en variables de entorno (`SOLVER_BASE_URL`).

---

## 11. Redis

- Uso definido: pub/sub para SSE multi-instancia.
- No lo conviertas en cache o store de sesión sin acuerdo arquitectónico previo.
- No persistas datos de negocio en Redis.
- Configuración por entorno, nunca hardcodeada.

---

## 12. Tests

### 12.1 Reglas

- `useJUnitPlatform()` ya está configurado.
- Todo nuevo caso de uso lleva test unitario en `application/usecase`.
- Todo controller relevante lleva test de slice (`@WebMvcTest`) con `spring-security-test`.
- Adaptadores de persistencia se cubren con `@DataJpaTest` (`auth`) o tests de integración con BD real para los que llaman PL/pgSQL.
- Nunca tests que dependan del orden de ejecución entre clases.
- Nunca uses `Thread.sleep` para sincronizar.

### 12.2 Estructura

```
src/test/java/online/horarios_api/<modulo>/
├── application/usecase/           # tests unitarios puros
├── infrastructure/in/web/         # tests de controller (MockMvc)
└── infrastructure/out/persistence/  # tests de adaptador
```

### 12.3 Cobertura

- Objetivo razonable: 70%+ líneas en `application/usecase`.
- No persigas cobertura en DTOs ni en clases de configuración.
- Reporte: `./gradlew test jacocoTestReport`.

### 12.4 Datos de prueba

- Usa builders/factories en `src/test/java/.../testsupport/` para construir entidades de dominio.
- No reutilices fixtures globales mutables.

### 12.5 Seguridad en tests

- Usa `@WithMockUser` o `SecurityMockMvcRequestPostProcessors.user(...)`.
- Verifica explícitamente que un endpoint protegido falla sin auth (`expect 401/403`) y pasa con auth correcta.

---

## 13. Reglas absolutas (resumen, ámbito backend)

- `hibernate.ddl-auto=none`. No cambies el schema desde Java.
- Todo DDL → `database/`.
- Todo acceso a BD fuera de `auth` → funciones PL/pgSQL.
- `domain` sin frameworks ni infraestructura.
- Controllers no acceden directo a repositorios.
- Tokens solo en cookies `httpOnly`.
- Nada de `allowedOrigins("*")`.
- Sin secrets hardcodeados.
- Sin reimplementar lógica que ya vive en SQL/PL/pgSQL.
- Sin asumir que el solver CSP es Java; vive aparte.
- Idioma: código y logs en inglés; comentarios y mensajes al usuario en español.

---

## 14. Comandos útiles

```bash
cd backend/horarios_api

# Run local
./gradlew bootRun

# Tests
./gradlew test
./gradlew test jacocoTestReport

# Build artefacto
./gradlew bootJar

# Limpiar
./gradlew clean
```

Variables de entorno típicas (en `backend/horarios_api/.env`):

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/horarios_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
JWT_SECRET=...
JWT_ACCESS_TTL_MINUTES=...
JWT_REFRESH_TTL_DAYS=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SOLVER_BASE_URL=http://solver:8090
REDIS_HOST=...
REDIS_PORT=...
SPRING_MAIL_HOST=...
SPRING_MAIL_USERNAME=...
SPRING_MAIL_PASSWORD=...
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 15. Idioma y estilo

- Código fuente: inglés.
- Comentarios internos en el código: español.
- Mensajes visibles al usuario (errores HTTP, correos): español.
- Naming Java: clases `PascalCase`, métodos/variables `camelCase`, constantes `UPPER_SNAKE_CASE`.
- Sin abreviaturas crípticas.
- Una clase pública por archivo.
- Sin comentarios redundantes; documenta el "por qué", no el "qué".

---

## 16. Commits

Convención obligatoria:

```
feat(scope): ...
fix(scope): ...
refactor(scope): ...
docs(scope): ...
test(scope): ...
chore(scope): ...
```

`scope` típicos en backend: `auth`, `course`, `academicperiod`, `token`, `web`, `db`, `security`, `ci`.

---

## 17. Mantenimiento de este archivo

Actualiza este `backend/AGENTS.md` cuando cambien:

- la estructura hexagonal de los módulos,
- las reglas de seguridad o autenticación,
- las dependencias clave del `build.gradle.kts`,
- la política de acceso a BD (PL/pgSQL vs JPA),
- los entornos o comandos de desarrollo.

Mantén este archivo y la raíz `AGENTS.md` consistentes entre sí. Si chocan, gana lo que esté más restringido.
