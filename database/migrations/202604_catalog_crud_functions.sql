-- ============================================================
--  Migración: Funciones CRUD para facultades y carreras
--  Fecha: 2026-04
--  Requiere: 202604_catalog_facultades_carreras_and_sync.sql
-- ============================================================
-- Funciones:
--   Listado (admin, incluye inactivas):
--     fn_list_all_facultades()
--     fn_list_all_carreras_by_facultad(p_facultad_id)
--   Mutación Facultad:
--     fn_create_facultad(code, name)
--     fn_update_facultad(id, code, name, is_active)
--     fn_deactivate_facultad(id)
--     fn_delete_facultad(id)
--   Mutación Carrera:
--     fn_create_carrera(facultad_id, code, name)
--     fn_update_carrera(id, facultad_id, code, name, is_active)
--     fn_deactivate_carrera(id)
--     fn_delete_carrera(id)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Listados admin (incluyen inactivas)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_list_all_facultades()
RETURNS SETOF facultades
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   facultades
    ORDER  BY name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_all_carreras_by_facultad(p_facultad_id UUID)
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
    ORDER  BY name ASC;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Mutación: Facultades
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_facultad(
    p_code  VARCHAR(20),
    p_name  VARCHAR(255)
)
RETURNS facultades
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    INSERT INTO facultades (code, name, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_facultad(
    p_id         UUID,
    p_code       VARCHAR(20),
    p_name       VARCHAR(255),
    p_is_active  BOOLEAN
)
RETURNS facultades
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    UPDATE facultades
       SET code       = TRIM(p_code),
           name       = TRIM(p_name),
           is_active  = COALESCE(p_is_active, is_active)
     WHERE id = p_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION fn_deactivate_facultad(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE facultades
       SET is_active = FALSE
     WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Cascada lógica: desactivar también las carreras de la facultad.
    UPDATE carreras
       SET is_active = FALSE
     WHERE facultad_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_facultad(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- La FK de carreras tiene ON DELETE CASCADE.
    -- Las FKs de profiles/students tienen ON DELETE SET NULL.
    DELETE FROM facultades WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Mutación: Carreras
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_carrera(
    p_facultad_id UUID,
    p_code        VARCHAR(20),
    p_name        VARCHAR(255)
)
RETURNS carreras
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row carreras%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facultades WHERE id = p_facultad_id) THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_facultad_id
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO carreras (facultad_id, code, name, is_active)
    VALUES (p_facultad_id, NULLIF(TRIM(p_code), ''), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_carrera(
    p_id           UUID,
    p_facultad_id  UUID,
    p_code         VARCHAR(20),
    p_name         VARCHAR(255),
    p_is_active    BOOLEAN
)
RETURNS carreras
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row carreras%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facultades WHERE id = p_facultad_id) THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_facultad_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE carreras
       SET facultad_id = p_facultad_id,
           code        = NULLIF(TRIM(p_code), ''),
           name        = TRIM(p_name),
           is_active   = COALESCE(p_is_active, is_active)
     WHERE id = p_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION fn_deactivate_carrera(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE carreras
       SET is_active = FALSE
     WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_carrera(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM carreras WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

COMMIT;