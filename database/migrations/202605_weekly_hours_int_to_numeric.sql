-- Migración: weekly_hours INTEGER → NUMERIC(3,1)
-- Motivo: duraciones reales son 1.5h (90 min) y 3h, no enteros.
-- Regla: 2h → 1.5h, 4h → 3h (THEORY, PRACTICE, GENERAL)
-- Fecha: 2026-05

BEGIN;

-- ── courses ───────────────────────────────────────────────────────────────────
ALTER TABLE courses
  ALTER COLUMN weekly_hours TYPE numeric(3,1);

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_weekly_hours_check;

ALTER TABLE courses
  ADD CONSTRAINT courses_weekly_hours_check CHECK (weekly_hours > 0);

UPDATE courses SET weekly_hours = 1.5 WHERE weekly_hours = 2;
UPDATE courses SET weekly_hours = 3.0 WHERE weekly_hours = 4;

-- ── course_components ─────────────────────────────────────────────────────────
ALTER TABLE course_components
  ALTER COLUMN weekly_hours TYPE numeric(3,1);

ALTER TABLE course_components
  DROP CONSTRAINT IF EXISTS course_components_weekly_hours_check;

ALTER TABLE course_components
  ADD CONSTRAINT course_components_weekly_hours_check CHECK (weekly_hours > 0);

UPDATE course_components SET weekly_hours = 1.5 WHERE weekly_hours = 2;
UPDATE course_components SET weekly_hours = 3.0 WHERE weekly_hours = 4;

-- ── funciones afectadas por firma o RETURNS TABLE ───────────────────────────
DROP FUNCTION IF EXISTS fn_create_course(VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_create_course(VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, NUMERIC(3,1), VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, NUMERIC(3,1), VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_list_course_components(UUID);
DROP FUNCTION IF EXISTS fn_list_courses_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_courses_paged(VARCHAR(255), INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_list_classroom_courses(UUID);
DROP FUNCTION IF EXISTS fn_solver_list_active_courses();
DROP FUNCTION IF EXISTS fn_solver_list_active_course_components();

CREATE OR REPLACE FUNCTION fn_create_course(
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_cycle              INTEGER,
    p_credits            INTEGER,
    p_required_credits   INTEGER,
    p_weekly_hours       NUMERIC(3,1),
    p_required_room_type VARCHAR(100),
    p_is_active          BOOLEAN
)
RETURNS courses
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_course courses;
    v_room_type VARCHAR(100);
BEGIN
    v_room_type := NULLIF(TRIM(p_required_room_type), '');

    IF v_room_type IS NULL THEN
        RAISE EXCEPTION 'El tipo de aula requerido es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO courses(code, name, cycle, credits, required_credits, weekly_hours, required_room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), COALESCE(p_cycle, 1), p_credits, COALESCE(p_required_credits, 0), p_weekly_hours, v_room_type, COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_course;

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    VALUES (v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active);

    RETURN v_course;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_course(
    p_course_id          UUID,
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_cycle              INTEGER,
    p_credits            INTEGER,
    p_required_credits   INTEGER,
    p_weekly_hours       NUMERIC(3,1),
    p_required_room_type VARCHAR(100),
    p_is_active          BOOLEAN
)
RETURNS courses
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_course courses;
    v_room_type VARCHAR(100);
BEGIN
    v_room_type := NULLIF(TRIM(p_required_room_type), '');

    IF v_room_type IS NULL THEN
        RAISE EXCEPTION 'El tipo de aula requerido es obligatorio.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE courses
    SET    code               = TRIM(p_code),
           name               = TRIM(p_name),
           cycle              = COALESCE(p_cycle, 1),
           credits            = p_credits,
           required_credits   = COALESCE(p_required_credits, 0),
           weekly_hours       = p_weekly_hours,
           required_room_type = v_room_type,
           is_active          = COALESCE(p_is_active, TRUE)
    WHERE  id = p_course_id
    RETURNING * INTO v_course;

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    SELECT v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active
    WHERE  v_course.id IS NOT NULL
      AND  NOT EXISTS (
          SELECT 1 FROM course_components cc WHERE cc.course_id = v_course.id
      );

    RETURN v_course;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_course_components(
    p_course_id UUID
)
RETURNS TABLE(
    id                 UUID,
    component_type     VARCHAR(20),
    weekly_hours       NUMERIC(3,1),
    required_room_type VARCHAR(100),
    sort_order         INTEGER,
    is_active          BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.id, cc.component_type, cc.weekly_hours, cc.required_room_type,
           cc.sort_order, cc.is_active
    FROM   course_components cc
    WHERE  cc.course_id = p_course_id
    ORDER  BY cc.sort_order ASC, cc.component_type ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_courses_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id                   UUID,
    code                 VARCHAR(50),
    name                 VARCHAR(255),
    cycle                INTEGER,
    credits              INTEGER,
    required_credits     INTEGER,
    weekly_hours         NUMERIC(3,1),
    required_room_type   VARCHAR(100),
    is_active            BOOLEAN,
    created_at           TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ,
    total_count          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits, c.weekly_hours,
           c.required_room_type, c.is_active, c.created_at, c.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   courses c
    ORDER  BY c.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_courses_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id                   UUID,
    code                 VARCHAR(50),
    name                 VARCHAR(255),
    cycle                INTEGER,
    credits              INTEGER,
    required_credits     INTEGER,
    weekly_hours         NUMERIC(3,1),
    required_room_type   VARCHAR(100),
    is_active            BOOLEAN,
    created_at           TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ,
    total_count          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits, c.weekly_hours,
           c.required_room_type, c.is_active, c.created_at, c.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   courses c
    WHERE  unaccent(LOWER(c.code)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
       OR  unaccent(LOWER(c.name)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
    ORDER  BY c.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_classroom_courses(
    p_classroom_id UUID
)
RETURNS TABLE(
    course_id    UUID,
    course_code  VARCHAR(50),
    course_name  VARCHAR(255),
    cycle        INTEGER,
    credits      INTEGER,
    weekly_hours NUMERIC(3,1),
    required_room_type VARCHAR(100),
    is_active    BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.cycle, c.credits,
           c.weekly_hours, c.required_room_type, c.is_active
    FROM   classroom_courses cc
    JOIN   courses c ON c.id = cc.course_id
    WHERE  cc.classroom_id = p_classroom_id
    ORDER  BY c.code ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_solver_list_active_courses()
RETURNS TABLE (
    id                 UUID,
    code               VARCHAR,
    name               VARCHAR,
    cycle              INTEGER,
    credits            INTEGER,
    required_credits   INTEGER,
    weekly_hours       NUMERIC(3,1),
    required_room_type VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits,
           c.weekly_hours, c.required_room_type
      FROM courses c
     WHERE c.is_active = TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION fn_solver_list_active_course_components()
RETURNS TABLE (
    id                 UUID,
    course_id          UUID,
    component_type     VARCHAR,
    weekly_hours       NUMERIC(3,1),
    required_room_type VARCHAR,
    sort_order         INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.id,
           cc.course_id,
           cc.component_type,
           cc.weekly_hours,
           cc.required_room_type,
           cc.sort_order
      FROM course_components cc
      JOIN courses c ON c.id = cc.course_id
     WHERE c.is_active = TRUE
       AND cc.is_active = TRUE
     ORDER BY c.code ASC, cc.sort_order ASC;
END;
$$;

COMMIT;
