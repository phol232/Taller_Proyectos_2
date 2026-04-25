-- Migration: add accumulated-credit prerequisite support to courses.

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS required_credits INTEGER NOT NULL DEFAULT 0;

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS chk_courses_required_credits;

ALTER TABLE courses
    ADD CONSTRAINT chk_courses_required_credits CHECK (required_credits >= 0);

DROP FUNCTION IF EXISTS fn_create_course(VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR, BOOLEAN);
DROP FUNCTION IF EXISTS fn_list_courses_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_courses_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_create_course(
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
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
BEGIN
    INSERT INTO courses(code, name, credits, required_credits, weekly_hours, required_room_type, is_active)
    VALUES (
        TRIM(p_code),
        TRIM(p_name),
        p_credits,
        COALESCE(p_required_credits, 0),
        p_weekly_hours,
        NULLIF(TRIM(p_required_room_type), ''),
        COALESCE(p_is_active, TRUE)
    )
    RETURNING * INTO v_course;

    RETURN v_course;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_course(
    p_course_id          UUID,
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
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
BEGIN
    UPDATE courses
    SET    code               = TRIM(p_code),
           name               = TRIM(p_name),
           credits            = p_credits,
           required_credits   = COALESCE(p_required_credits, 0),
           weekly_hours       = p_weekly_hours,
           required_room_type = NULLIF(TRIM(p_required_room_type), ''),
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
    SELECT c.id, c.code, c.name, c.credits, c.required_credits, c.weekly_hours,
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
    SELECT c.id, c.code, c.name, c.credits, c.required_credits, c.weekly_hours,
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
