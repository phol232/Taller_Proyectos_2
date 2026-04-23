-- ============================================================
--  Migración: Catálogo Facultades/Carreras + Sync Profiles↔Students + Email en Students
--  Fecha: 2026-04
-- ============================================================
-- 1. Tablas de catálogo: facultades, carreras
-- 2. ALTER TABLE profiles: facultad_id, carrera_id
-- 3. ALTER TABLE students: facultad_id, carrera_id (career → NULLABLE)
-- 4. Funciones catálogo: fn_list_facultades, fn_list_carreras, fn_list_carreras_by_facultad
-- 5. Actualización fn_list_all_students / fn_get_student_by_id / fn_search_students (JOIN users→email)
-- 6. Nueva fn_get_student_by_user_id
-- 7. Actualización fn_upsert_profile para aceptar facultad_id/carrera_id
-- 8. Trigger de sync profiles→students cuando cambian facultad_id/carrera_id
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. TABLAS DE CATÁLOGO
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS facultades (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_facultades_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS carreras (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    facultad_id  UUID           NOT NULL,
    code         VARCHAR(20),
    name         VARCHAR(255)   NOT NULL,
    is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_carreras_facultad
        FOREIGN KEY (facultad_id) REFERENCES facultades(id) ON DELETE CASCADE,
    CONSTRAINT uq_carreras_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_carreras_facultad_id ON carreras(facultad_id);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trg_facultades_updated_at ON facultades;
CREATE TRIGGER trg_facultades_updated_at
    BEFORE UPDATE ON facultades
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_carreras_updated_at ON carreras;
CREATE TRIGGER trg_carreras_updated_at
    BEFORE UPDATE ON carreras
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. ALTER TABLE profiles — agregar facultad_id, carrera_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS facultad_id UUID NULL REFERENCES facultades(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS carrera_id  UUID NULL REFERENCES carreras(id)   ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_facultad_id ON profiles(facultad_id);
CREATE INDEX IF NOT EXISTS idx_profiles_carrera_id  ON profiles(carrera_id);

-- ─────────────────────────────────────────────────────────────
-- 3. ALTER TABLE students — agregar facultad_id, carrera_id; career → NULLABLE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS facultad_id UUID NULL REFERENCES facultades(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS carrera_id  UUID NULL REFERENCES carreras(id)   ON DELETE SET NULL;

ALTER TABLE students ALTER COLUMN career DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_facultad_id ON students(facultad_id);
CREATE INDEX IF NOT EXISTS idx_students_carrera_id  ON students(carrera_id);

-- ─────────────────────────────────────────────────────────────
-- 4. FUNCIONES DE CATÁLOGO
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_list_facultades()
RETURNS SETOF facultades
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   facultades
    WHERE  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_carreras()
RETURNS SETOF carreras
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   carreras
    WHERE  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_carreras_by_facultad(p_facultad_id UUID)
RETURNS SETOF carreras
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   carreras
    WHERE  facultad_id = p_facultad_id
      AND  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. FUNCIONES STUDENTS — RETURNS TABLE con email via LEFT JOIN users
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_all_students();
CREATE OR REPLACE FUNCTION fn_list_all_students()
RETURNS TABLE(
    id            UUID,
    user_id       UUID,
    code          VARCHAR(50),
    full_name     VARCHAR(255),
    cycle         INTEGER,
    career        VARCHAR(255),
    credit_limit  INTEGER,
    is_active     BOOLEAN,
    facultad_id   UUID,
    carrera_id    UUID,
    email         VARCHAR(255),
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    ORDER  BY s.full_name ASC;
END;
$$;

DROP FUNCTION IF EXISTS fn_get_student_by_id(UUID);
CREATE OR REPLACE FUNCTION fn_get_student_by_id(p_student_id UUID)
RETURNS TABLE(
    id            UUID,
    user_id       UUID,
    code          VARCHAR(50),
    full_name     VARCHAR(255),
    cycle         INTEGER,
    career        VARCHAR(255),
    credit_limit  INTEGER,
    is_active     BOOLEAN,
    facultad_id   UUID,
    carrera_id    UUID,
    email         VARCHAR(255),
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE  s.id = p_student_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_search_students(VARCHAR);
CREATE OR REPLACE FUNCTION fn_search_students(p_query VARCHAR(255))
RETURNS TABLE(
    id            UUID,
    user_id       UUID,
    code          VARCHAR(50),
    full_name     VARCHAR(255),
    cycle         INTEGER,
    career        VARCHAR(255),
    credit_limit  INTEGER,
    is_active     BOOLEAN,
    facultad_id   UUID,
    carrera_id    UUID,
    email         VARCHAR(255),
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE  s.code      ILIKE '%' || p_query || '%'
       OR  s.full_name ILIKE '%' || p_query || '%'
       OR  s.career    ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY s.full_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_student_by_user_id(p_user_id UUID)
RETURNS TABLE(
    id            UUID,
    user_id       UUID,
    code          VARCHAR(50),
    full_name     VARCHAR(255),
    cycle         INTEGER,
    career        VARCHAR(255),
    credit_limit  INTEGER,
    is_active     BOOLEAN,
    facultad_id   UUID,
    carrera_id    UUID,
    email         VARCHAR(255),
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE  s.user_id = p_user_id;
END;
$$;

-- fn_create_student: aceptar facultad_id/carrera_id, career NULLABLE
DROP FUNCTION IF EXISTS fn_create_student(UUID, VARCHAR, VARCHAR, INTEGER, VARCHAR, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION fn_create_student(
    p_user_id       UUID,
    p_code          VARCHAR(50),
    p_full_name     VARCHAR(255),
    p_cycle         INTEGER,
    p_career        VARCHAR(255),
    p_credit_limit  INTEGER,
    p_is_active     BOOLEAN,
    p_facultad_id   UUID DEFAULT NULL,
    p_carrera_id    UUID DEFAULT NULL
)
RETURNS students
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_student students;
BEGIN
    INSERT INTO students(user_id, code, full_name, cycle, career, credit_limit, is_active, facultad_id, carrera_id)
    VALUES (
        p_user_id,
        TRIM(p_code),
        TRIM(p_full_name),
        p_cycle,
        NULLIF(TRIM(COALESCE(p_career, '')), ''),
        COALESCE(p_credit_limit, 22),
        COALESCE(p_is_active, TRUE),
        p_facultad_id,
        p_carrera_id
    )
    RETURNING * INTO v_student;

    RETURN v_student;
END;
$$;

-- fn_update_student: aceptar facultad_id/carrera_id
DROP FUNCTION IF EXISTS fn_update_student(UUID, UUID, VARCHAR, VARCHAR, INTEGER, VARCHAR, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION fn_update_student(
    p_student_id    UUID,
    p_user_id       UUID,
    p_code          VARCHAR(50),
    p_full_name     VARCHAR(255),
    p_cycle         INTEGER,
    p_career        VARCHAR(255),
    p_credit_limit  INTEGER,
    p_is_active     BOOLEAN,
    p_facultad_id   UUID DEFAULT NULL,
    p_carrera_id    UUID DEFAULT NULL
)
RETURNS students
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_student students;
BEGIN
    UPDATE students
    SET    user_id      = p_user_id,
           code         = TRIM(p_code),
           full_name    = TRIM(p_full_name),
           cycle        = p_cycle,
           career       = NULLIF(TRIM(COALESCE(p_career, '')), ''),
           credit_limit = COALESCE(p_credit_limit, 22),
           is_active    = COALESCE(p_is_active, TRUE),
           facultad_id  = p_facultad_id,
           carrera_id   = p_carrera_id
    WHERE  id = p_student_id
    RETURNING * INTO v_student;

    RETURN v_student;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. fn_upsert_profile — soporte para facultad_id/carrera_id
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_upsert_profile(UUID, VARCHAR, VARCHAR, sex_type, SMALLINT);
CREATE OR REPLACE FUNCTION fn_upsert_profile(
    p_user_id     UUID,
    p_dni         VARCHAR(20),
    p_phone       VARCHAR(20),
    p_sex         sex_type,
    p_age         SMALLINT,
    p_facultad_id UUID DEFAULT NULL,
    p_carrera_id  UUID DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_profile profiles;
BEGIN
    INSERT INTO profiles (user_id, dni, phone, sex, age, facultad_id, carrera_id)
    VALUES (p_user_id, p_dni, p_phone, p_sex, p_age, p_facultad_id, p_carrera_id)
    ON CONFLICT (user_id) DO UPDATE
        SET dni         = EXCLUDED.dni,
            phone       = EXCLUDED.phone,
            sex         = EXCLUDED.sex,
            age         = EXCLUDED.age,
            facultad_id = EXCLUDED.facultad_id,
            carrera_id  = EXCLUDED.carrera_id
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. TRIGGER: sync profiles → students
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_student_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo actualiza si existe un student vinculado al mismo user_id
    UPDATE students
    SET    facultad_id = NEW.facultad_id,
           carrera_id  = NEW.carrera_id
    WHERE  user_id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_student ON profiles;
CREATE TRIGGER trg_profiles_sync_student
    AFTER INSERT OR UPDATE OF facultad_id, carrera_id ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_student_from_profile();

COMMIT;