# database/AGENTS.md

> Lee este archivo antes de modificar cualquier archivo dentro de `database/`.

---

## Estructura de la carpeta

```
database/
├── schema.sql                        ← fuente de verdad del esquema completo
├── functions/
│   ├── academic_periods/functions.sql
│   ├── carreras/functions.sql
│   ├── classrooms/functions.sql
│   ├── courses/functions.sql
│   ├── facultades/functions.sql
│   ├── password_reset_tokens/functions.sql
│   ├── refresh_tokens/functions.sql
│   ├── solver/functions.sql
│   ├── students/functions.sql
│   ├── teachers/functions.sql
│   └── users/functions.sql
├── migrations/                       ← historial de cambios incrementales
│   └── YYYYMM_descripcion.sql
├── triggers/
│   ├── Tiggers_Funciones.sql
│   └── solver_notify.sql
└── backups/                          ← ignorado por git, solo local
```

---

## Regla 1 — `schema.sql` es la fuente de verdad

Todo `CREATE TABLE`, `CREATE TYPE`, `CREATE INDEX`, `ALTER TABLE` o `CONSTRAINT` que exista en producción **debe estar reflejado en `schema.sql`**.

- Si agregas una tabla nueva → agrégala en `schema.sql`.
- Si modificas una columna → actualiza su definición en `schema.sql`.
- Si agregas un índice o constraint → agrégalo en `schema.sql`.
- `schema.sql` debe poder ejecutarse desde cero en una BD vacía y dejar el esquema completo y funcional.

---

## Regla 2 — Las funciones PL/pgSQL van en `functions/<tabla>/functions.sql`

Cada módulo tiene su propio archivo de funciones. Toda función nueva o modificada debe actualizarse en el archivo correspondiente usando `CREATE OR REPLACE FUNCTION`.

| Módulo | Archivo |
|---|---|
| Aulas | `functions/classrooms/functions.sql` |
| Cursos | `functions/courses/functions.sql` |
| Docentes | `functions/teachers/functions.sql` |
| Alumnos | `functions/students/functions.sql` |
| Usuarios | `functions/users/functions.sql` |
| Períodos académicos | `functions/academic_periods/functions.sql` |
| Facultades | `functions/facultades/functions.sql` |
| Carreras | `functions/carreras/functions.sql` |
| Tokens de refresco | `functions/refresh_tokens/functions.sql` |
| Reset de contraseña | `functions/password_reset_tokens/functions.sql` |
| Solver CSP | `functions/solver/functions.sql` |

Si se crea un módulo nuevo, crea una carpeta nueva y su `functions.sql`.

---

## Regla 3 — Todo cambio tiene su migración en `migrations/`

Cada vez que se modifique el esquema o las funciones, el cambio **también debe expresarse como una migración** en `database/migrations/`.

### Convención de nombre

```
YYYYMM_descripcion_corta_en_snake_case.sql
```

Ejemplos:
- `202604_add_classroom_course_components.sql`
- `202605_add_index_teacher_courses.sql`
- `202606_rename_column_weekly_hours.sql`

### Contenido mínimo de una migración

```sql
-- Descripción del cambio
-- Fecha: YYYY-MM-DD

-- 1. DDL (si aplica)
ALTER TABLE ...;
CREATE TABLE ...;

-- 2. Funciones actualizadas (copiar el CREATE OR REPLACE del archivo de funciones)
CREATE OR REPLACE FUNCTION ...;
```

---

## Regla 4 — Migración global acumulativa

El archivo **`migrations/000_full_migration.sql`** (o el de mayor número al final) consolida **todos los cambios del sprint actual** en orden de ejecución, para poder levantar la BD completa en un solo paso.

Después de agregar una migración individual, **actualiza la migración global** añadiendo al final:

```sql
-- ── Sprint N · YYYY-MM-DD ───────────────────────────────────
\i migrations/YYYYMM_tu_cambio.sql
```

O bien copia el contenido directamente si el entorno no soporta `\i`.

> Si no existe aún el archivo global, créalo como `migrations/000_full_migration.sql`.

---

## Flujo obligatorio para cualquier cambio

```
1. Modificar schema.sql          → refleja el nuevo estado del esquema
2. Modificar functions/<x>/functions.sql → refleja la función nueva/actualizada
3. Crear migrations/YYYYMM_xxx.sql → expresa el cambio incremental
4. Actualizar la migración global → añade el nuevo archivo al final
```

Si el cambio es **solo de función** (sin DDL), el paso 1 no aplica pero los pasos 2, 3 y 4 sí.

---

## Convenciones PostgreSQL

- UUID con `gen_random_uuid()`
- `TIMESTAMPTZ` para toda columna de fecha/hora
- Índices explícitos para FKs, búsquedas frecuentes y constraints de unicidad
- Nombres en `snake_case` para tablas, columnas, funciones e índices
- Prefijo `fn_` para todas las funciones PL/pgSQL
- Prefijo `trg_` para triggers
- Prefijo `idx_` para índices
- No usar arrays o JSON para relaciones que deben estar normalizadas

---

## Restricciones

- `hibernate.ddl-auto=none` — el ORM nunca toca el esquema.
- Todo DDL va en `database/`, nunca en el backend.
- No reimplementes en Java lógica que ya exista en SQL o PL/pgSQL.
- La carpeta `database/backups/` está en `.gitignore`; no subas dumps al repositorio.
