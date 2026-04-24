-- ============================================================
-- Migration: paginated listing functions for all catalog entities.
-- Adds fn_list_XXX_paged and fn_search_XXX_paged for:
--   teachers, students, courses, classrooms, users.
-- Each paged function returns the same columns as its non-paged
-- counterpart plus a `total_count BIGINT` window column so that
-- a single round-trip provides both the page content and the
-- grand total for the caller.
-- ============================================================

-- ─── TEACHERS ────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_teachers_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_teachers_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_list_teachers_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id          UUID,
    user_id     UUID,
    code        VARCHAR(50),
    full_name   VARCHAR(255),
    specialty   VARCHAR(255),
    is_active   BOOLEAN,
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    ORDER  BY t.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_teachers_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id          UUID,
    user_id     UUID,
    code        VARCHAR(50),
    full_name   VARCHAR(255),
    specialty   VARCHAR(255),
    is_active   BOOLEAN,
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.code      ILIKE '%' || p_query || '%'
       OR  t.full_name ILIKE '%' || p_query || '%'
       OR  t.specialty ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY t.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

-- ─── STUDENTS ────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_students_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_students_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_list_students_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
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
    updated_at    TIMESTAMPTZ,
    total_count   BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    ORDER  BY s.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_students_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
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
    updated_at    TIMESTAMPTZ,
    total_count   BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.user_id, s.code, s.full_name, s.cycle, s.career,
           s.credit_limit, s.is_active, s.facultad_id, s.carrera_id,
           u.email, s.created_at, s.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE  s.code      ILIKE '%' || p_query || '%'
       OR  s.full_name ILIKE '%' || p_query || '%'
       OR  s.career    ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY s.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

-- ─── COURSES ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_courses_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_courses_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_list_courses_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id                   UUID,
    code                 VARCHAR(50),
    name                 VARCHAR(255),
    credits              INTEGER,
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
    SELECT c.id, c.code, c.name, c.credits, c.weekly_hours,
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
    SELECT c.id, c.code, c.name, c.credits, c.weekly_hours,
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

-- ─── CLASSROOMS ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_classrooms_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_classrooms_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_list_classrooms_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id          UUID,
    code        VARCHAR(50),
    name        VARCHAR(255),
    capacity    INTEGER,
    room_type   VARCHAR(100),
    is_active   BOOLEAN,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cl.id, cl.code, cl.name, cl.capacity, cl.room_type,
           cl.is_active, cl.created_at, cl.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   classrooms cl
    ORDER  BY cl.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_classrooms_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id          UUID,
    code        VARCHAR(50),
    name        VARCHAR(255),
    capacity    INTEGER,
    room_type   VARCHAR(100),
    is_active   BOOLEAN,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cl.id, cl.code, cl.name, cl.capacity, cl.room_type,
           cl.is_active, cl.created_at, cl.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   classrooms cl
    WHERE  cl.code      ILIKE '%' || p_query || '%'
       OR  cl.name      ILIKE '%' || p_query || '%'
       OR  cl.room_type ILIKE '%' || p_query || '%'
    ORDER  BY cl.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

-- ─── USERS ───────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_list_users_paged(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_search_users_paged(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_list_users_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id              UUID,
    email           VARCHAR(255),
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255),
    role            user_role,
    is_active       BOOLEAN,
    email_verified  BOOLEAN,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    total_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    ORDER  BY u.created_at DESC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_users_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id              UUID,
    email           VARCHAR(255),
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255),
    role            user_role,
    is_active       BOOLEAN,
    email_verified  BOOLEAN,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    total_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    WHERE  u.full_name ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY u.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;
