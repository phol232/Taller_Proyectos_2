ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS cycle INTEGER NOT NULL DEFAULT 1;

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS chk_courses_cycle;

ALTER TABLE courses
    ADD CONSTRAINT chk_courses_cycle CHECK (cycle BETWEEN 1 AND 10);

UPDATE courses
SET    required_room_type = 'Presencial'
WHERE  required_room_type IS NULL
   OR  BTRIM(required_room_type) = '';

ALTER TABLE courses
    ALTER COLUMN required_room_type SET NOT NULL;

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS chk_courses_required_room_type;

ALTER TABLE courses
    ADD CONSTRAINT chk_courses_required_room_type CHECK (BTRIM(required_room_type) <> '');

DROP FUNCTION IF EXISTS fn_create_course(VARCHAR, VARCHAR, INTEGER, INTEGER, INTEGER, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR, VARCHAR, INTEGER, INTEGER, INTEGER, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS fn_list_courses_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_courses_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_create_course(
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_cycle              INTEGER,
    p_credits            INTEGER,
    p_required_credits   INTEGER,
    p_weekly_hours       INTEGER,
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
    p_weekly_hours       INTEGER,
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
    RETURN v_course;
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
    weekly_hours         INTEGER,
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
    weekly_hours         INTEGER,
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
    WHERE  c.code ILIKE '%' || p_query || '%'
       OR  c.name ILIKE '%' || p_query || '%'
    ORDER  BY c.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;
