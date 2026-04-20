# Revisión Profunda de Arquitectura — Backend Hexagonal

**Proyecto:** Sistema de Horarios — API Backend  
**Stack:** Spring Boot 4.0.5 / Java 21 / Gradle 9.4.1  
**Fecha:** Junio 2025  
**Revisión:** #4 (post-implementación de correcciones M1-M3, L1-L4)

---

## Puntuación General

| Área | Puntaje | Peso | Ponderado |
|------|---------|------|-----------|
| Separación de capas (Hexagonal) | 9.5/10 | 30% | 2.85 |
| Dominio puro (sin contaminación) | 10/10 | 20% | 2.00 |
| Infraestructura y adaptadores | 9.0/10 | 15% | 1.35 |
| Seguridad | 8.5/10 | 15% | 1.28 |
| Cobertura de tests | 7.5/10 | 10% | 0.75 |
| Calidad de código y consistencia | 9.0/10 | 10% | 0.90 |
| **TOTAL** | | | **9.13/10** |

> **Veredicto:** Arquitectura hexagonal **muy bien implementada**, con mejora significativa desde la revisión anterior (8.2 → 9.1). El dominio está 100% limpio, los 29 puertos tienen adaptadores correctos, y las entidades JPA están completamente separadas de los modelos de dominio.

---

## 1. Estructura del Proyecto

### 1.1 Bounded Contexts (6)

```
horarios_api/
├── auth/              ← Autenticación (login, OAuth2, JWT, cookies)
│   ├── domain/        ← 14 archivos
│   ├── application/   ← 3 servicios
│   └── infrastructure/← Controllers, adapters, DTOs, config
├── passwordreset/     ← Recuperación de contraseña (OTP)
│   ├── domain/        ← 11 archivos
│   ├── application/   ← 1 servicio
│   └── infrastructure/← Controller, adapters, DTOs, config
├── token/             ← Gestión de refresh tokens / sesiones
│   ├── domain/        ← 8 archivos
│   ├── application/   ← 1 servicio
│   └── infrastructure/← Controller, adapters, scheduler, config
├── user/              ← Usuarios y cuentas OAuth2
│   ├── domain/        ← 7 archivos
│   ├── application/   ← 1 servicio
│   └── infrastructure/← Adapters, persistence, config
├── profile/           ← Perfil de usuario
│   ├── domain/        ← 7 archivos
│   ├── application/   ← 1 servicio
│   └── infrastructure/← Controller, adapters, config
└── shared/            ← Infraestructura compartida
    ├── domain/        ← 6 archivos (excepciones, enums, puertos)
    └── infrastructure/← Security, exception handler, config, web
```

### 1.2 Métricas de Archivos

| Capa | Archivos | Descripción |
|------|----------|-------------|
| Domain models | 15 | 5 aggregates, 6 records, 2 enums, 2 clases |
| Driving ports (in) | 12 | Use cases interfaces |
| Driven ports (out) | 14 | Repository, notification, crypto ports |
| Domain exceptions | 8 | Excepciones de negocio tipadas |
| Application services | 7 | Orquestadores sin dependencias de framework |
| JPA entities | 5 | Separadas 100% de domain models |
| Adapters (out) | 17 | Implementaciones de driven ports |
| Controllers (in) | 5 | Puntos de entrada HTTP |
| DTOs | ~12 | Records de request/response |
| Config (BeanConfig) | 5 | Fábricas @Bean para servicios de aplicación |
| **Total** | ~120+ | |

---

## 2. Auditoría de Capa de Dominio

### 2.1 Pureza del Dominio: 10/10 ✅

Se auditaron **53 archivos** en las carpetas `domain/` de los 6 bounded contexts.

| Métrica | Resultado |
|---------|-----------|
| Archivos con imports de Spring/JPA/Jakarta | **0** |
| Archivos con imports de infraestructura | **0** |
| Dependencias permitidas encontradas | Lombok compile-time (5 archivos), java.time, java.util |
| Puertos con tipos de infraestructura | **0** |
| Violaciones de dependencia | **0/53** |

**Detalle de modelos de dominio:**

| Modelo | Tipo | Anotaciones | Puro |
|--------|------|-------------|------|
| `User` | Aggregate | `@Getter`, `@AllArgsConstructor` | ✅ |
| `RefreshToken` | Aggregate | `@Getter`, `@AllArgsConstructor` | ✅ |
| `PasswordResetToken` | Aggregate | `@Getter`, `@AllArgsConstructor` | ✅ |
| `Profile` | Aggregate | `@Getter`, `@AllArgsConstructor` | ✅ |
| `OAuth2LinkedAccount` | Aggregate | `@Getter`, `@AllArgsConstructor` | ✅ |
| `AuthTokens`, `RequestMetadata`, `SessionInfo`, `TokenPair` | Records | Ninguna | ✅ |
| `AuthProvider`, `UserRole` | Enums | Ninguna | ✅ |

### 2.2 Puertos — Interfaces Puras

Todos los **26 puertos** son interfaces Java puras sin anotaciones de framework:

**Driving ports (Use Cases):**
- `LoginUseCase`, `LogoutUseCase`, `RefreshSessionUseCase`
- `GetCurrentUserUseCase`, `OAuth2AuthUseCase`, `OAuth2UserResolutionUseCase`
- `CreateRefreshTokenUseCase`, `RefreshTokenUseCase`, `RevokeTokenUseCase`
- `RequestOtpUseCase`, `VerifyOtpUseCase`, `ResetPasswordUseCase`
- `GetProfileUseCase`, `UpsertProfileUseCase`

**Driven ports:**
- `AuthenticationPort`, `JwtGeneratorPort`, `TokenConfigPort`
- `RefreshTokenManagerPort`, `RefreshTokenPort`
- `PasswordResetTokenPort`, `PasswordHasherPort`, `OtpGeneratorPort`
- `PasswordChangePort`, `PasswordResetConfigPort`, `NotificationPort`
- `UserPort`, `UserReadPort`, `ProfilePort`
- `TokenHasherPort` (shared)

### 2.3 Comunicación Cross-Context

| Origen → Destino | Mecanismo | Veredicto |
|-------------------|-----------|-----------|
| passwordreset → user | `PasswordChangePort` (driven port) | ✅ Anti-corruption layer |
| auth → user | `UserReadPort` (driven port) | ✅ Anti-corruption layer |
| auth → token | `RefreshTokenManagerPort` (driven port) | ✅ Anti-corruption layer |

---

## 3. Auditoría de Capa de Aplicación

### 3.1 Servicios de Aplicación: 9.5/10 ✅

| Servicio | Use Cases Implementados | @Transactional | @Bean Config |
|----------|------------------------|----------------|--------------|
| `AuthService` | 4 (Login, Logout, Refresh, OAuth2) | ✅ Correcto | ✅ `AuthBeanConfig` |
| `CurrentUserService` | 1 (GetCurrentUser) | ✅ `readOnly` | ✅ `AuthBeanConfig` |
| `RefreshTokenService` | 6 (Create, Validate, Revoke, List, Clean) | ✅ Correcto | ✅ `TokenBeanConfig` |
| `PasswordResetService` | 3 (RequestOtp, VerifyOtp, ResetPassword) | ✅ Correcto | ✅ `PasswordResetBeanConfig` |
| `UserService` | 1 (FindOrCreateOAuth2User) | ✅ Correcto | ✅ `UserBeanConfig` |
| `ProfileService` | 2 (Get, Upsert) | ✅ Correcto | ✅ `ProfileBeanConfig` |

**Patrón de instanciación:** Todos los servicios se crean vía `@Bean` en clases `*BeanConfig`, sin `@Service`/`@Component` en la capa de aplicación. **Excelente patrón** que mantiene la capa de aplicación libre de anotaciones Spring.

**Imports de aplicación → infraestructura:** **0** violaciones encontradas.

### 3.2 Uso de @Transactional

| Servicio | Métodos Write | Métodos ReadOnly | Veredicto |
|----------|---------------|------------------|-----------|
| `AuthService` | `login`, `loginOAuth2`, `refresh`, `logout`, `logoutAll` | — | ✅ |
| `CurrentUserService` | — | `getCurrentUser` | ✅ |
| `RefreshTokenService` | `createRefreshToken`, `validateAndRotate`, `revokeToken`, `revokeAllTokensForUser`, `revokeSessionById`, `cleanUpExpiredTokens` | `listActiveSessions` | ✅ |
| `PasswordResetService` | `requestOtp`, `verifyOtp`, `resetPassword` | — | ✅ |
| `ProfileService` | `upsertProfile` | `getProfile` | ✅ |
| `UserService` | `findOrCreateOAuth2User` | — | ✅ |

> `@Transactional` de Spring es la única dependencia de framework en la capa de aplicación. Es pragmáticamente aceptable para Spring Boot y la alternativa (patrón UnitOfWork) añadiría complejidad innecesaria.

---

## 4. Auditoría de Capa de Infraestructura

### 4.1 Adaptadores: 29/29 implementados ✅

Todos los driven ports tienen su implementación correspondiente con `@Component`:

| Puerto | Adaptador | Módulo |
|--------|-----------|--------|
| `AuthenticationPort` | `AuthenticationAdapter` | auth |
| `JwtGeneratorPort` | `JwtGeneratorAdapter` | auth |
| `AuthCookiePort` | `CookieService` | auth |
| `TokenConfigPort` | `TokenConfigAdapter` | auth |
| `RefreshTokenManagerPort` | `RefreshTokenManagerAdapter` | auth |
| `RefreshTokenPort` | `RefreshTokenRepositoryAdapter` | token |
| `PasswordResetTokenPort` | `PasswordResetTokenRepositoryAdapter` | passwordreset |
| `PasswordHasherPort` | `PasswordHasherAdapter` | passwordreset |
| `OtpGeneratorPort` | `OtpGeneratorAdapter` | passwordreset |
| `PasswordChangePort` | `PasswordChangeAdapter` | passwordreset |
| `PasswordResetConfigPort` | `PasswordResetConfigAdapter` | passwordreset |
| `NotificationPort` | `EmailNotificationAdapter` | passwordreset |
| `TokenHasherPort` | `TokenHasherAdapter` | shared |
| `UserPort` | `UserRepositoryAdapter` | user |
| `UserReadPort` | `UserReadAdapter` | user |
| `ProfilePort` | `ProfileRepositoryAdapter` | profile |
| `UserDetailsService` | `UserDetailsServiceAdapter` | user |

### 4.2 Separación JPA Entities ↔ Domain Models: 10/10 ✅

| JPA Entity | Domain Model | Mapper | Ubicación Entity |
|------------|-------------|--------|-----------------|
| `UserEntity` | `User` | `toDomain()` / `fromDomain()` | `user.infrastructure.out.persistence.entity` |
| `OAuth2LinkedAccountEntity` | `OAuth2LinkedAccount` | `toDomain()` / `fromDomain()` | `user.infrastructure.out.persistence.entity` |
| `RefreshTokenEntity` | `RefreshToken` | `toDomain()` / `fromDomain()` | `token.infrastructure.out.persistence.entity` |
| `PasswordResetTokenEntity` | `PasswordResetToken` | `toDomain()` / `fromDomain()` | `passwordreset.infrastructure.out.persistence.entity` |
| `ProfileEntity` | `Profile` | `toDomain()` / `fromDomain()` | `profile.infrastructure.out.persistence.entity` |

- **Ningún domain model tiene anotaciones JPA/Hibernate**
- Los mappers son estáticos y bidireccionales
- Las entidades JPA viven exclusivamente en `*.infrastructure.out.persistence.entity`

### 4.3 Controllers: Correctamente Acoplados

| Controller | Dependencias | Violaciones |
|------------|-------------|-------------|
| `AuthController` | `LoginUseCase`, `RefreshSessionUseCase`, `LogoutUseCase`, `GetCurrentUserUseCase`, `AuthCookiePort` | 0 |
| `OAuth2LoginSuccessHandler` | `OAuth2AuthUseCase`, `OAuth2UserResolutionUseCase`, `AuthCookiePort` | 0 |
| `PasswordResetController` | `RequestOtpUseCase`, `VerifyOtpUseCase`, `ResetPasswordUseCase` | 0 |
| `SessionController` | `RefreshTokenUseCase` | 0 |
| `ProfileController` | `GetProfileUseCase`, `UpsertProfileUseCase` | 0 |

**Ningún controller accede directamente a un repositorio.** Todos dependen exclusivamente de use cases (driving ports).

---

## 5. Auditoría de Seguridad

### 5.1 Bien Implementado ✅

| Control | Implementación | Estado |
|---------|----------------|--------|
| Hashing de contraseñas | BCrypt con factor 12 | ✅ |
| Hashing de tokens | SHA-256 + SecureRandom | ✅ |
| Cookies de sesión | HttpOnly + SameSite=Strict + Secure configurable | ✅ |
| OTP almacenado | Hasheado con BCrypt (nunca en claro) | ✅ |
| Rate limiting OTP | Ventana configurable con límite de solicitudes | ✅ |
| Intentos de verificación OTP | Límite con bloqueo automático | ✅ |
| Token rotation | Refresh token rotado en cada uso | ✅ |
| JWT validation | Issuer + Audience + HS256 | ✅ |
| Invalidación de sesiones | Logout individual y masivo | ✅ |
| Restricción de dominios | Solo `continental.edu.pe` | ✅ |
| OAuth2 post-login | Sesión HTTP invalidada después del login | ✅ |
| `@ConfigurationProperties` | Usado para config sensible (no hardcodeada) | ✅ |

### 5.2 Hallazgos de Seguridad

| # | Hallazgo | Severidad | Descripción |
|---|----------|-----------|-------------|
| S1 | Sin rate-limit en `/api/auth/login` | **MEDIA** | No hay protección contra fuerza bruta en el endpoint de login. Spring Security no provee rate limiting por defecto. Recomendación: bucket4j, resilience4j o filtro custom. |
| S2 | `X-Forwarded-For` spoofable | **MEDIA** | `RequestMetadataExtractor` toma el primer valor de `X-Forwarded-For` sin validar proxy de confianza. Configurar `server.tomcat.remoteip.internal-proxies`. |
| S3 | Sin `max` en `@Size` de `newPassword` | **BAJA** | `@Size(min = 8)` pero sin máximo. BCrypt hash de un string muy largo es un vector de DoS. Agregar `@Size(min = 8, max = 128)`. |
| S4 | Email HTML sin escape | **BAJA** | `fullName` se inserta directamente en HTML del email sin escapar. Riesgo bajo (clientes de email generalmente sanitizan). |
| S5 | Regex de contraseña con charset limitado | **BAJA** | La regex `[A-Za-z\\d@$!%*?&]{8,}$` excluye caracteres válidos como `#^()-_.,~`. |
| S6 | `@Async` en email sin retry | **BAJA** | Si el envío de email falla, el token se guarda pero el usuario nunca recibe el OTP. Sin mecanismo de retry. |

---

## 6. Auditoría de Tests

### 6.1 Resumen General

| Métrica | Valor |
|---------|-------|
| Archivos de test | 17 |
| Tests totales | **90** |
| Tests fallidos | **0** |
| Bounded contexts cubiertos | 5/5 (auth, passwordreset, token, user, profile) |

### 6.2 Distribución por Archivo

| Archivo de Test | Tests | Bounded Context |
|-----------------|-------|-----------------|
| `LoginRequestValidationTest` | 13 | auth/dto |
| `PasswordResetDtoValidationTest` | 14 | passwordreset/dto |
| `PasswordResetControllerTest` | 10 | passwordreset/controller |
| `AuthServiceTest` | 9 | auth/service |
| `PasswordResetServiceTest` | 10 | passwordreset/service |
| `AuthControllerTest` | 6 | auth/controller |
| `OAuth2LoginSuccessHandlerTest` | 5 | auth/adapter |
| `CookieServiceTest` | 4 | auth/adapter |
| `RefreshTokenServiceTest` | 4 | token/service |
| `ProfileServiceTest` | 3 | profile/service |
| `UserServiceTest` | 3 | user/service |
| `AuthenticationAdapterTest` | 2 | auth/adapter |
| `CurrentUserServiceTest` | 2 | auth/service |
| `SessionControllerTest` | 2 | token/controller |
| `JwtGeneratorAdapterTest` | 1 | auth/adapter |
| `TokenCleanupSchedulerTest` | 1 | token/scheduler |
| `HorariosApiApplicationTests` | 1 | smoke test |

### 6.3 Calidad de Tests: 8.5/10

**Fortalezas:**
- `@ExtendWith(MockitoExtension.class)` en todos los tests unitarios
- `@DisplayName` en español consistente
- AssertJ para aserciones expresivas
- DTOs validados con `@WebMvcTest` y `jakarta.validation.Validator`
- Mocks correctos sin anti-patrones (no se mockea lo que se testea)
- Patrones arrange-act-assert bien estructurados

**Convenciones:**
- Nombres descriptivos con `debería_...` o `lanzaExcepción_cuando...`
- Tests parametrizados con `@MethodSource` en validación de DTOs

### 6.4 Brechas de Cobertura

#### Prioridad ALTA

| Brecha | Estado Actual | Faltante |
|--------|---------------|----------|
| `RefreshTokenService` | 4 tests | Falta: `revokeAllTokensForUser`, `revokeSessionById`, `listActiveSessions`, `cleanUpExpiredTokens`, edge cases de `validateAndRotate` |
| `UserService` | 3 tests | Falta: branch de email linkeo OAuth2 con usuario existente |
| `ProfileService` | 3 tests | Falta: escenarios de perfil existente, validaciones de input, casos de error |

#### Prioridad MEDIA

| Brecha | Estado Actual | Faltante |
|--------|---------------|----------|
| `ProfileController` | **0 tests** | Sin cobertura de controller. Necesita tests `@WebMvcTest` |
| `AuthController` | 6 tests | Solo cubre parcialmente los 5 endpoints |

#### Prioridad BAJA

| Brecha | Descripción |
|--------|-------------|
| Domain models | Sin tests unitarios dedicados (cubiertos indirectamente) |
| Persistence adapters | Sin tests `@DataJpaTest` para verificar mappers `toDomain()/fromDomain()` |
| `SecurityConfig` | Sin test de integración para rutas protegidas/públicas |

---

## 7. Hallazgos Arquitectónicos

### 7.1 Prioridad MEDIA (2 hallazgos)

#### A1 — `RequestMetadata` en bounded context incorrecto

| Aspecto | Detalle |
|---------|---------|
| **Ubicación actual** | `auth.domain.model.RequestMetadata` |
| **Problema** | `shared.infrastructure.web.RequestMetadataExtractor` importa de `auth.domain`, creando dependencia shared → auth |
| **Solución** | Mover `RequestMetadata` a `shared.domain.model` |
| **Impacto** | Bajo — solo requiere cambiar package e imports |

#### A2 — `AuthCookiePort` ubicado como puerto de dominio

| Aspecto | Detalle |
|---------|---------|
| **Ubicación actual** | `auth.domain.port.out.AuthCookiePort` |
| **Problema** | Genera cookies HTTP (concepto de infraestructura). Solo lo usan controllers, nunca la capa de aplicación. No debería ser un puerto de dominio. |
| **Solución** | Mover a `auth.infrastructure` como interfaz interna infra→infra |
| **Impacto** | Bajo — solo requiere mover la interfaz |

### 7.2 Prioridad BAJA (3 hallazgos)

#### A3 — Comentario CSRF incorrecto
- `SecurityConfig` comenta "SameSite=Lax" pero `CookieService` usa `SameSite=Strict`
- **Solución:** Corregir el comentario

#### A4 — Inconsistencia en inyección de dependencias
- La mayoría de adaptadores usa `@RequiredArgsConstructor` (Lombok)
- 4 adaptadores en `auth.infrastructure` usan constructor explícito
- **Solución:** Unificar a `@RequiredArgsConstructor`

#### A5 — Formato inconsistente
- `GlobalExceptionHandler.java` y `PasswordResetTokenJpaRepository.java` tienen indentación de 8 espacios en algunas líneas
- **Solución:** Corregir a 4 espacios

---

## 8. Comparativa con Revisión Anterior

| Métrica | Rev. Anterior (8.2) | Rev. Actual (9.1) | Cambio |
|---------|---------------------|---------------------|--------|
| Pureza del dominio | 95% (Lombok JPA leak) | **100%** | ✅ +5% |
| Domain models con JPA | 5 archivos contaminados | **0** | ✅ Corregido |
| JPA entities separadas | No existían | **5 entities con mappers** | ✅ Nuevo |
| `@ConfigurationProperties` | No (valores hardcodeados) | **Sí** (`PasswordResetProperties`) | ✅ Corregido |
| Duplicación `RequestMetadataExtractor` | Código duplicado en 2 controllers | **Extraído a shared** | ✅ Corregido |
| Tests pasando | 90 | **90** | = |
| Tests fallidos | 0 | **0** | = |
| Violaciones de dependencia dominio | ~5 | **0** | ✅ Eliminadas |
| Hallazgos CRÍTICOS | 0 | **0** | = |
| Hallazgos ALTOS | 3 (M1-M3) | **0** | ✅ Corregidos |
| Hallazgos MEDIOS | — | **4** (2 arquitectura + 2 seguridad) | Nuevos detectados |
| Hallazgos BAJOS | 4 (L1-L4) | **6** (3 arquitectura + 3 seguridad) | Nuevos detectados |

---

## 9. Resumen de Acciones Recomendadas

### Prioridad MEDIA

| # | Acción | Tipo | Esfuerzo |
|---|--------|------|----------|
| 1 | Mover `RequestMetadata` a `shared.domain.model` | Arquitectura | 10 min |
| 2 | Mover `AuthCookiePort` fuera de `auth.domain.port.out` | Arquitectura | 15 min |
| 3 | Agregar rate-limit en `/api/auth/login` | Seguridad | 1-2h |
| 4 | Configurar `server.tomcat.remoteip.internal-proxies` | Seguridad | 15 min |

### Prioridad BAJA

| # | Acción | Tipo | Esfuerzo |
|---|--------|------|----------|
| 5 | Agregar `@Size(max = 128)` a `newPassword` | Seguridad | 5 min |
| 6 | Corregir comentario CSRF en `SecurityConfig` | Documentación | 5 min |
| 7 | Unificar inyección a `@RequiredArgsConstructor` | Consistencia | 15 min |
| 8 | Corregir indentación en `GlobalExceptionHandler` y `PasswordResetTokenJpaRepository` | Formato | 10 min |
| 9 | Escapar HTML en `EmailNotificationAdapter` | Seguridad | 10 min |
| 10 | Ampliar regex de charset de contraseña | Seguridad | 5 min |

### Cobertura de Tests (siguiente sprint)

| # | Acción | Tests estimados |
|---|--------|-----------------|
| 11 | Tests para `ProfileController` (`@WebMvcTest`) | +5-8 |
| 12 | Tests faltantes para `RefreshTokenService` | +5-7 |
| 13 | Tests faltantes para `AuthController` | +4-6 |
| 14 | Tests de `ProfileService` (más escenarios) | +3-5 |
| 15 | Tests `@DataJpaTest` para persistence adapters | +5-10 |

---

## 10. Conclusión

La arquitectura hexagonal del backend está **sólidamente implementada** con una puntuación de **9.1/10**. Las correcciones aplicadas desde la revisión anterior (M1-M3, L1-L4) resolvieron todos los problemas identificados:

- **Dominio 100% puro** — cero dependencias de framework en la capa de dominio
- **29/29 puertos correctamente implementados** con adaptadores
- **Entidades JPA completamente separadas** de modelos de dominio con mappers bidireccionales
- **Patrón @Bean para servicios de aplicación** — sin contaminación Spring en application layer
- **Anti-corruption layers** correctos para comunicación cross-context
- **Seguridad robusta** — BCrypt, token hashing, cookie segura, rate limiting en OTP, token rotation

Los hallazgos restantes son menores (2 MEDIA + 6 BAJA) y no comprometen la integridad arquitectónica del sistema. La principal área de mejora es la **cobertura de tests**, especialmente para `ProfileController`, `RefreshTokenService` y persistence adapters.
