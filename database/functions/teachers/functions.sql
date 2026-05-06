-- ============================================================
--  Funciones de gestión de teachers
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_teacher
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_teacher(
    p_user_id    UUID,
    p_code       VARCHAR(50),
    p_full_name  VARCHAR(255),
    p_specialty  VARCHAR(255),
    p_is_active  BOOLEAN
)
RETURNS teachers
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_teacher teachers;
BEGIN
    INSERT INTO teachers(user_id, code, full_name, specialty, is_active)
    VALUES (p_user_id, TRIM(p_code), TRIM(p_full_name), TRIM(p_specialty), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_teacher;
    RETURN v_teacher;
END;
$$;

-- ----------------------------------------------------------
-- fn_update_teacher
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_teacher(
    p_teacher_id UUID,
    p_user_id    UUID,
    p_code       VARCHAR(50),
    p_full_name  VARCHAR(255),
    p_specialty  VARCHAR(255),
    p_is_active  BOOLEAN
)
RETURNS teachers
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_teacher teachers;
BEGIN
    UPDATE teachers
    SET    user_id   = p_user_id,
           code      = TRIM(p_code),
           full_name = TRIM(p_full_name),
           specialty = TRIM(p_specialty),
           is_active = COALESCE(p_is_active, TRUE)
    WHERE  id = p_teacher_id
    RETURNING * INTO v_teacher;
    RETURN v_teacher;
END;
$$;

-- ----------------------------------------------------------
-- fn_get_teacher_by_id (con email JOIN)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_teacher_by_id(
    p_teacher_id UUID
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
    updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.id = p_teacher_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_teachers (con email JOIN)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_teachers()
RETURNS TABLE(
    id          UUID,
    user_id     UUID,
    code        VARCHAR(50),
    full_name   VARCHAR(255),
    specialty   VARCHAR(255),
    is_active   BOOLEAN,
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    ORDER  BY t.full_name ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_teachers (con email JOIN)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_teachers(
    p_query VARCHAR(255)
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
    updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.code ILIKE '%' || p_query || '%'
       OR  t.full_name ILIKE '%' || p_query || '%'
       OR  t.specialty ILIKE '%' || p_query || '%'
       OR  u.email ILIKE '%' || p_query || '%'
    ORDER  BY t.full_name ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_deactivate_teacher
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deactivate_teacher(
    p_teacher_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE teachers
    SET    is_active = FALSE
    WHERE  id = p_teacher_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_teacher
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_teacher(
    p_teacher_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments
    WHERE  teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM teacher_courses WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components WHERE teacher_id = p_teacher_id;
    DELETE FROM course_teacher_candidates WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_availability WHERE teacher_id = p_teacher_id;
    DELETE FROM teachers WHERE id = p_teacher_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_set_teacher_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_teacher_availability(
    p_teacher_id   UUID,
    p_day_of_week  day_of_week,
    p_start_time   TIME,
    p_end_time     TIME,
    p_is_available BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_time_slot_id UUID;
BEGIN
    v_time_slot_id := fn_ensure_time_slot(p_day_of_week, p_start_time, p_end_time);
    INSERT INTO teacher_availability(teacher_id, time_slot_id, is_available)
    VALUES (p_teacher_id, v_time_slot_id, COALESCE(p_is_available, TRUE))
    ON CONFLICT (teacher_id, time_slot_id) DO UPDATE
        SET is_available = EXCLUDED.is_available;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_teacher_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_teacher_availability(
    p_teacher_id UUID
)
RETURNS TABLE(
    day_of_week  day_of_week,
    start_time   TIME,
    end_time     TIME,
    is_available BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ts.day_of_week, ts.start_time, ts.end_time, ta.is_available
    FROM   teacher_availability ta
    JOIN   time_slots ts ON ts.id = ta.time_slot_id
    WHERE  ta.teacher_id = p_teacher_id
    ORDER  BY ts.day_of_week, ts.start_time;
END;
$$;

-- ----------------------------------------------------------
-- fn_clear_teacher_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_clear_teacher_availability(
    p_teacher_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_availability
    WHERE  teacher_id = p_teacher_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_teacher_courses
-- Agrega en una operación varios cursos que puede dictar un docente.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.id = ANY(p_course_ids)
    ON CONFLICT (teacher_id, course_id) DO NOTHING;

    INSERT INTO teacher_course_components(teacher_id, course_component_id)
    SELECT p_teacher_id, cc.id
    FROM   course_components cc
    WHERE  cc.course_id = ANY(p_course_ids)
      AND  cc.is_active = TRUE
    ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_teacher_courses_by_codes
-- Agrega en una operación varios cursos por código.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
    ON CONFLICT (teacher_id, course_id) DO NOTHING;

    INSERT INTO teacher_course_components(teacher_id, course_component_id)
    SELECT p_teacher_id, cc.id
    FROM   course_components cc
    JOIN   courses c ON c.id = cc.course_id
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
      AND  cc.is_active = TRUE
    ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_remove_teacher_courses
-- Quita en una operación varios cursos de un docente.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_remove_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id
       AND course_id = ANY(p_course_ids);

    DELETE FROM teacher_course_components tcc
    USING course_components cc
    WHERE tcc.teacher_id = p_teacher_id
      AND tcc.course_component_id = cc.id
      AND cc.course_id = ANY(p_course_ids);
END;
$$;

-- ----------------------------------------------------------
-- fn_remove_teacher_courses_by_codes
-- Quita en una operación varios cursos por código.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_remove_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses tc
    USING courses c
    WHERE tc.teacher_id = p_teacher_id
      AND tc.course_id = c.id
      AND c.code = ANY(
          ARRAY(
              SELECT DISTINCT UPPER(TRIM(code_value))
              FROM   unnest(p_course_codes) AS code_value
              WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
          )
      );

    DELETE FROM teacher_course_components tcc
    USING course_components cc
    JOIN courses c ON c.id = cc.course_id
    WHERE tcc.teacher_id = p_teacher_id
      AND tcc.course_component_id = cc.id
      AND c.code = ANY(
          ARRAY(
              SELECT DISTINCT UPPER(TRIM(code_value))
              FROM   unnest(p_course_codes) AS code_value
              WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
          )
      );
END;
$$;

-- ----------------------------------------------------------
-- fn_set_teacher_courses
-- Reemplaza en una operación los cursos que puede dictar un docente.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses(p_teacher_id, p_course_ids);
END;
$$;

-- ----------------------------------------------------------
-- fn_set_teacher_courses_by_codes
-- Reemplaza en una operación los cursos que puede dictar un docente usando códigos.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses_by_codes(p_teacher_id, p_course_codes);
END;
$$;

-- ----------------------------------------------------------
-- fn_set_teacher_course_components
-- Reemplaza los componentes que puede dictar un docente.
-- Mantiene teacher_courses sincronizado como índice por curso.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_teacher_course_components(
    p_teacher_id     UUID,
    p_component_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_course_components
    WHERE  teacher_id = p_teacher_id;

    IF p_component_ids IS NOT NULL AND array_length(p_component_ids, 1) IS NOT NULL THEN
        INSERT INTO teacher_course_components(teacher_id, course_component_id)
        SELECT p_teacher_id, cc.id
        FROM   course_components cc
        WHERE  cc.id = ANY(p_component_ids)
          AND  cc.is_active = TRUE
        ON CONFLICT (teacher_id, course_component_id) DO NOTHING;
    END IF;

    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT DISTINCT p_teacher_id, cc.course_id
    FROM   teacher_course_components tcc
    JOIN   course_components cc ON cc.id = tcc.course_component_id
    WHERE  tcc.teacher_id = p_teacher_id
    ON CONFLICT (teacher_id, course_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_teacher_course_component_ids
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_teacher_course_component_ids(
    p_teacher_id UUID
)
RETURNS TABLE(course_component_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT tcc.course_component_id
    FROM   teacher_course_components tcc
    JOIN   course_components cc ON cc.id = tcc.course_component_id
    JOIN   courses c ON c.id = cc.course_id
    WHERE  tcc.teacher_id = p_teacher_id
    ORDER  BY c.code ASC, cc.sort_order ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_teacher_course_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_teacher_course_codes(
    p_teacher_id UUID
)
RETURNS TABLE(course_code VARCHAR(50))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   teacher_courses tc
    JOIN   courses c ON c.id = tc.course_id
    WHERE  tc.teacher_id = p_teacher_id
    ORDER  BY c.code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_course_teacher_ids
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_course_teacher_ids(
    p_course_id UUID
)
RETURNS TABLE(teacher_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id
    FROM   teacher_courses tc
    JOIN   teachers t ON t.id = tc.teacher_id
    WHERE  tc.course_id = p_course_id
    ORDER  BY t.full_name ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_teachers_paged
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_search_teachers_paged
-- ----------------------------------------------------------
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
