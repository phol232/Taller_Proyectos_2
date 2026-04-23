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
-- fn_get_teacher_by_id
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_teacher_by_id(
    p_teacher_id UUID
)
RETURNS teachers
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_teacher teachers;
BEGIN
    SELECT * INTO v_teacher
    FROM   teachers
    WHERE  id = p_teacher_id;
    RETURN v_teacher;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_teachers
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_teachers()
RETURNS SETOF teachers
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   teachers
    ORDER  BY full_name ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_teachers
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_teachers(
    p_query VARCHAR(255)
)
RETURNS SETOF teachers
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   teachers
    WHERE  code ILIKE '%' || p_query || '%'
       OR  full_name ILIKE '%' || p_query || '%'
       OR  specialty ILIKE '%' || p_query || '%'
    ORDER  BY full_name ASC;
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
    FROM   section_assignments
    WHERE  teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM section_teacher_candidates WHERE teacher_id = p_teacher_id;
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