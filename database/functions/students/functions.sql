-- ============================================================
--  Funciones de gestión de students
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_student (con soporte facultad_id/carrera_id)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_update_student (con soporte facultad_id/carrera_id)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_get_student_by_id (con email JOIN)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_list_all_students (con email JOIN)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_search_students (con email JOIN)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_get_student_by_user_id (con email JOIN)
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_deactivate_student
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deactivate_student(
    p_student_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE students
    SET    is_active = FALSE
    WHERE  id = p_student_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_student
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_student(
    p_student_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_schedules_count
    FROM   student_schedules
    WHERE  student_id = p_student_id;

    IF v_schedules_count > 0 THEN
        RAISE EXCEPTION 'El estudiante tiene % horario(s) generado(s) y no puede eliminarse. Desactívelo en su lugar.', v_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM student_completed_courses WHERE student_id = p_student_id;
    DELETE FROM students WHERE id = p_student_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_student_completed_course_by_code
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_student_completed_course_by_code(
    p_student_id   UUID,
    p_course_code  VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_course_id UUID;
BEGIN
    SELECT id INTO v_course_id
    FROM   courses
    WHERE  code = TRIM(p_course_code);

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'El curso aprobado no existe: %', p_course_code;
    END IF;

    INSERT INTO student_completed_courses(student_id, course_id)
    VALUES (p_student_id, v_course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_student_completed_course_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_student_completed_course_codes(
    p_student_id UUID
)
RETURNS TABLE(course_code VARCHAR(50))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   student_completed_courses scc
    JOIN   courses c ON c.id = scc.course_id
    WHERE  scc.student_id = p_student_id
    ORDER  BY c.code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_clear_student_completed_courses
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_clear_student_completed_courses(
    p_student_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM student_completed_courses
    WHERE  student_id = p_student_id;
END;
$$;