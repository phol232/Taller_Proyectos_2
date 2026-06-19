# Anexo B - Evaluación de Seguridad basada en OWASP Top 10

## B.1 Alcance y metodología

La auditoría de seguridad se realizó sobre:
- Código fuente de frontend, backend y solver.
- Reporte de vulnerabilidades generado por SonarQube.
- Revisión de arquitectura de autenticación y autorización.
- Validación de buenas prácticas de manejo de credenciales, sesiones y entradas.

**Estándar de referencia:** OWASP Top 10 (última versión estable aplicable a aplicaciones Web modernas).

## B.2 Matriz de vulnerabilidades

| ID | Categoría OWASP | Riesgo | Severidad | Componente | Hallazgo | Mitigación implementada / propuesta | Estado |
|---|---|---|---|---|---|---|---|
| OWASP-01 | A01:2021 - Broken Access Control | Medio | MAJOR | Frontend `lib/i18n/es.ts:94` | Posible contraseña hardcodeada en traducciones | Se confirmó falso positivo (etiqueta/placeholder de UI); se ajustaron los textos y se agregó `// NOSONAR` con justificación en `frontend/lib/i18n/es.ts` y `frontend/lib/i18n/en.ts` | Mitigado |
| OWASP-02 | A07:2021 - Identification and Authentication Failures | Alto | BLOCKER | Solver `app/core/config.py:16` | Contraseña de PostgreSQL en código fuente | Se eliminó el default con credenciales; `SOLVER_DB_DSN` ahora es obligatoria por variable de entorno; se actualizaron `solver/README.md` y `solver/.env.example` con placeholders | Mitigado |
| OWASP-03 | A05:2021 - Security Misconfiguration | Medio | INFO | General | Variables de configuración sensibles en archivos de propiedades | Validar que backend y solver usen `python-dotenv` y Spring `env_file` | Parcial |
| OWASP-04 | A03:2021 - Injection | Bajo | - | Backend | Uso de funciones PL/pgSQL y `JdbcTemplate` con parámetros | No se detectaron consultas concatenadas; arquitectura actual previene SQL Injection | Mitigado |
| OWASP-05 | A02:2021 - Cryptographic Failures | Bajo | - | Backend | JWT almacenado en cookies `httpOnly` | No se almacenan tokens en `localStorage`; cookies seguras configuradas | Mitigado |
| OWASP-06 | A01:2021 - Broken Access Control | Bajo | - | Backend | Controllers acceden solo a través de puertos/casos de uso | Arquitectura hexagonal limita exposición directa de repositorios | Mitigado |
| OWASP-07 | A08:2021 - Software and Data Integrity Failures | Bajo | - | Frontend | Dependencias gestionadas con `pnpm` y `package.json` fijos | Uso de lockfiles; sin paquetes sospechosos detectados | Mitigado |

## B.3 Análisis detallado por riesgo

### OWASP-02 - Credenciales hardcodeadas en el solver (Alto) — Resuelto

**Descripción técnica**
En `solver/app/core/config.py` se detectó una contraseña de PostgreSQL directamente en el código fuente. Esto permite que cualquier persona con acceso al repositorio obtenga credenciales de producción.

**Impacto original**
- Compromiso completo de la base de datos si el repositorio es público o filtrado.
- Exposición de datos académicos y horarios.
- Dificultad para rotar credenciales sin redeploy.

**Evidencia**
- SonarQube: `[BLOCKER] Make sure this PostgreSQL password gets changed and removed from the code.`
- Archivo: `solver/app/core/config.py:16`

**Mitigación implementada**
1. Se eliminó el valor por defecto con credenciales en `db_dsn`; la variable de entorno `SOLVER_DB_DSN` ahora es obligatoria (`Field(...)`).
2. Se actualizó `solver/.env.example` con un DSN de ejemplo usando placeholders genéricos (`<USER>:<PASSWORD>`).
3. Se actualizó `solver/README.md` con la documentación de la variable obligatoria.

**Resultado verificado en SonarQube:** Vulnerabilities 1 → 0; Security Rating E (5.0) → A (1.0). Re-confirmado en el análisis más reciente (sin regresión).

### OWASP-01 - Posible contraseña hardcodeada en traducciones (Medio) — Resuelto

**Descripción técnica**
SonarQube reportó un posible password hardcodeado en `frontend/lib/i18n/es.ts`. Se verificó si era un placeholder o un valor real.

**Impacto original**
- Si era real: filtración de credencial.
- Si era placeholder: falso positivo, pero requería documentación/exclusión.

**Mitigación implementada**
1. Se verificó la línea 94 de `lib/i18n/es.ts`: el hallazgo correspondía a la etiqueta y placeholder de UI del campo contraseña, no a una credencial real.
2. Se ajustaron los textos (`passwordLabel`, `passwordPlaceholder`) para evitar cadenas que simulen credenciales.
3. Se agregó la anotación `// NOSONAR` con justificación documentada en `frontend/lib/i18n/es.ts` y `frontend/lib/i18n/en.ts`.

**Resultado verificado en SonarQube:** Vulnerabilities 1 → 0; Security Rating C (3.0) → A (1.0). Re-confirmado en el análisis más reciente: `planner-uc-frontend` mantiene Security Rating A (1.0) y 0 vulnerabilidades (ver [`Anexo_A_SonarQube.md`](Anexo_A_SonarQube.md), A.2).

## B.4 Validación de autenticación y autorización

| Aspecto | Implementación actual | Cumplimiento |
|---|---|---|
| Almacenamiento de tokens | Cookies `httpOnly`; nunca `localStorage` | ✅ Cumple |
| Autenticación | Spring Security + JWT + OAuth2 Google | ✅ Cumple |
| Autorización | Roles y permisos en endpoints | ✅ Parcial |
| CORS | Sin `allowedOrigins("*")` | ✅ Cumple |
| Sesiones | Stateless con JWT | ✅ Cumple |
| Secrets | Solver DB DSN ahora obligatorio por `.env` (`SOLVER_DB_DSN`); sin defaults con credenciales | ✅ Cumple |

## B.5 Análisis de riesgo residual

| Riesgo residual | Probabilidad | Impacto | Nivel | Acción recomendada |
|---|---|---|---|---|
| Fuga de credenciales por repositorio público | Baja (mitigado) | Alto | Bajo | Mantener `SOLVER_DB_DSN` fuera del código; rotar la credencial real en el entorno de despliegue |
| Falso positivo de password en frontend | Resuelto | - | - | Mantener el comentario `// NOSONAR` documentado para evitar regresión del hallazgo |
| SQL Injection por mala práctica futura | Baja | Alto | Medio | Mantener uso de funciones PL/pgSQL y parámetros |
| XSS por almacenamiento inadecuado de JWT | Muy baja | Alto | Bajo | Mantener cookies `httpOnly` |

## B.6 Evidencias técnicas

- Reporte SonarQube Vulnerabilities: http://localhost:9000/project/issues?id=planner-uc-frontend&resolved=false&types=VULNERABILITY
- Reporte SonarQube Security Hotspots: http://localhost:9000/security_hotspots?id=planner-uc-frontend
- Configuración de seguridad backend: `backend/horarios_api/src/main/java/.../config/SecurityConfig.java`
- Variables de entorno: `.env`, `backend/horarios_api/.env`, `solver/.env`

## B.7 Checklist de seguridad

- [x] Autenticación centralizada con JWT en cookies `httpOnly`
- [x] Sin tokens en `localStorage` / `sessionStorage`
- [x] CORS restringido
- [x] Backend no expone repositorios directamente
- [x] Uso de funciones PL/pgSQL para operaciones de BD
- [x] Credenciales de base de datos externalizadas en solver
- [x] Verificación de placeholder de contraseña en frontend
- [ ] Validación de inputs en formularios (Zod + React Hook Form)
- [ ] Rate limiting en API pública
