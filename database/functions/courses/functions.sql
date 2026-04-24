-- ============================================================
--  Funciones de gestión de courses
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_course
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_course(
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_credits            INTEGER,
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
    INSERT INTO courses(code, name, credits, weekly_hours, required_room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), p_credits, p_weekly_hours, NULLIF(TRIM(p_required_room_type), ''), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_course;
    RETURN v_course;
END;
$$;

-- ----------------------------------------------------------
-- fn_update_course
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_course(
    p_course_id          UUID,
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_credits            INTEGER,
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
           weekly_hours       = p_weekly_hours,
           required_room_type = NULLIF(TRIM(p_required_room_type), ''),
           is_active          = COALESCE(p_is_active, TRUE)
    WHERE  id = p_course_id
    RETURNING * INTO v_course;
    RETURN v_course;
END;
$$;

-- ----------------------------------------------------------
-- fn_get_course_by_id
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_course_by_id(
    p_course_id UUID
)
RETURNS courses
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_course courses;
BEGIN
    SELECT * INTO v_course
    FROM   courses
    WHERE  id = p_course_id;
    RETURN v_course;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_courses
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_courses()
RETURNS SETOF courses
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   courses
    ORDER  BY code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_courses
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_courses(
    p_query VARCHAR(255)
)
RETURNS SETOF courses
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   courses
    WHERE  code ILIKE '%' || p_query || '%'
       OR  name ILIKE '%' || p_query || '%'
    ORDER  BY code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_deactivate_course
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deactivate_course(
    p_course_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE courses
    SET    is_active = FALSE
    WHERE  id = p_course_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_course
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_course(
    p_course_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offerings_count     INTEGER;
    v_prereq_of_count     INTEGER;
    v_completed_count     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE course_id = p_course_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_prereq_of_count
    FROM   course_prerequisites WHERE prerequisite_course_id = p_course_id;

    IF v_prereq_of_count > 0 THEN
        RAISE EXCEPTION 'El curso es prerrequisito de % curso(s) y no puede eliminarse.', v_prereq_of_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_completed_count
    FROM   student_completed_courses WHERE course_id = p_course_id;

    IF v_completed_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % aprobación(es) por estudiantes y no puede eliminarse. Desactívelo en su lugar.', v_completed_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_prerequisites WHERE course_id = p_course_id;
    DELETE FROM courses WHERE id = p_course_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_course_prerequisite_by_code
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_course_prerequisite_by_code(
    p_course_id          UUID,
    p_prerequisite_code  VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_prerequisite_id UUID;
BEGIN
    SELECT id INTO v_prerequisite_id
    FROM   courses
    WHERE  code = TRIM(p_prerequisite_code);

    IF v_prerequisite_id IS NULL THEN
        RAISE EXCEPTION 'El curso prerrequisito no existe: %', p_prerequisite_code;
    END IF;

    IF v_prerequisite_id = p_course_id THEN
        RAISE EXCEPTION 'Un curso no puede ser prerrequisito de sí mismo.';
    END IF;

    INSERT INTO course_prerequisites(course_id, prerequisite_course_id)
    VALUES (p_course_id, v_prerequisite_id)
    ON CONFLICT (course_id, prerequisite_course_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_clear_course_prerequisites
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_clear_course_prerequisites(
    p_course_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM course_prerequisites
    WHERE  course_id = p_course_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_course_prerequisite_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_course_prerequisite_codes(
    p_course_id UUID
)
RETURNS TABLE(prerequisite_code VARCHAR(50))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   course_prerequisites cp
    JOIN   courses c ON c.id = cp.prerequisite_course_id
    WHERE  cp.course_id = p_course_id
    ORDER  BY c.code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_courses_paged
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_search_courses_paged
-- ----------------------------------------------------------
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