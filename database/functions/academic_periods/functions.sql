-- ============================================================
--  Funciones de gestión de academic_periods
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_academic_period
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_academic_period(
    p_code                VARCHAR(50),
    p_name                VARCHAR(150),
    p_starts_at           DATE,
    p_ends_at             DATE,
    p_status              VARCHAR(20),
    p_max_student_credits INTEGER
)
RETURNS academic_periods
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period academic_periods;
BEGIN
    INSERT INTO academic_periods(code, name, starts_at, ends_at, status, max_student_credits)
    VALUES (
        TRIM(p_code),
        TRIM(p_name),
        p_starts_at,
        p_ends_at,
        UPPER(TRIM(p_status)),
        COALESCE(p_max_student_credits, 22)
    )
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;

-- ----------------------------------------------------------
-- fn_update_academic_period
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_academic_period(
    p_period_id           UUID,
    p_code                VARCHAR(50),
    p_name                VARCHAR(150),
    p_starts_at           DATE,
    p_ends_at             DATE,
    p_status              VARCHAR(20),
    p_max_student_credits INTEGER
)
RETURNS academic_periods
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period academic_periods;
BEGIN
    UPDATE academic_periods
    SET    code                = TRIM(p_code),
           name                = TRIM(p_name),
           starts_at           = p_starts_at,
           ends_at             = p_ends_at,
           status              = UPPER(TRIM(p_status)),
           max_student_credits = COALESCE(p_max_student_credits, 22)
    WHERE  id = p_period_id
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;

-- ----------------------------------------------------------
-- fn_get_academic_period_by_id
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_academic_period_by_id(
    p_period_id UUID
)
RETURNS academic_periods
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_period academic_periods;
BEGIN
    SELECT * INTO v_period
    FROM   academic_periods
    WHERE  id = p_period_id;
    RETURN v_period;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_academic_periods
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_academic_periods()
RETURNS SETOF academic_periods
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   academic_periods
    ORDER  BY starts_at DESC, code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_academic_periods
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_academic_periods(
    p_query VARCHAR(255)
)
RETURNS SETOF academic_periods
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   academic_periods
    WHERE  code ILIKE '%' || p_query || '%'
       OR  name ILIKE '%' || p_query || '%'
       OR  status ILIKE '%' || p_query || '%'
    ORDER  BY starts_at DESC, code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_deactivate_academic_period
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deactivate_academic_period(
    p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE academic_periods
    SET    is_active = FALSE
    WHERE  id = p_period_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_academic_period
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_academic_period(
    p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offerings_count         INTEGER;
    v_teaching_schedules      INTEGER;
    v_student_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE academic_period_id = p_period_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_teaching_schedules
    FROM   teaching_schedules WHERE academic_period_id = p_period_id;

    IF v_teaching_schedules > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) docente(s) y no puede eliminarse.', v_teaching_schedules
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_schedules_count
    FROM   student_schedules WHERE academic_period_id = p_period_id;

    IF v_student_schedules_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) de estudiantes y no puede eliminarse.', v_student_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM academic_periods WHERE id = p_period_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_ensure_time_slot
-- Helper: asegura que exista un time_slot, lo crea si no existe.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_ensure_time_slot(
    p_day_of_week day_of_week,
    p_start_time  TIME,
    p_end_time    TIME
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_slot_id UUID;
BEGIN
    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'La franja horaria es inválida.';
    END IF;

    INSERT INTO time_slots(day_of_week, start_time, end_time, slot_order, is_active)
    VALUES (
        p_day_of_week,
        p_start_time,
        p_end_time,
        EXTRACT(HOUR FROM p_start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM p_start_time)::INTEGER,
        TRUE
    )
    ON CONFLICT (day_of_week, start_time, end_time) DO UPDATE
        SET is_active = TRUE
    RETURNING id INTO v_slot_id;

    RETURN v_slot_id;
END;
$$;