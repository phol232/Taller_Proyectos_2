-- ============================================================
--  Funciones de gestión de classrooms
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_classroom
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_classroom(
    p_code       VARCHAR(50),
    p_name       VARCHAR(255),
    p_capacity   INTEGER,
    p_room_type  VARCHAR(100),
    p_is_active  BOOLEAN
)
RETURNS classrooms
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    INSERT INTO classrooms(code, name, capacity, room_type, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), p_capacity, TRIM(p_room_type), COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_classroom;
    RETURN v_classroom;
END;
$$;

-- ----------------------------------------------------------
-- fn_update_classroom
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_classroom(
    p_classroom_id UUID,
    p_code         VARCHAR(50),
    p_name         VARCHAR(255),
    p_capacity     INTEGER,
    p_room_type    VARCHAR(100),
    p_is_active    BOOLEAN
)
RETURNS classrooms
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    UPDATE classrooms
    SET    code      = TRIM(p_code),
           name      = TRIM(p_name),
           capacity  = p_capacity,
           room_type = TRIM(p_room_type),
           is_active = COALESCE(p_is_active, TRUE)
    WHERE  id = p_classroom_id
    RETURNING * INTO v_classroom;
    RETURN v_classroom;
END;
$$;

-- ----------------------------------------------------------
-- fn_get_classroom_by_id
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_classroom_by_id(
    p_classroom_id UUID
)
RETURNS classrooms
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_classroom classrooms;
BEGIN
    SELECT * INTO v_classroom
    FROM   classrooms
    WHERE  id = p_classroom_id;
    RETURN v_classroom;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_classrooms
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_classrooms()
RETURNS SETOF classrooms
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   classrooms
    ORDER  BY code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_classrooms
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_classrooms(
    p_query VARCHAR(255)
)
RETURNS SETOF classrooms
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   classrooms
    WHERE  code ILIKE '%' || p_query || '%'
       OR  name ILIKE '%' || p_query || '%'
       OR  room_type ILIKE '%' || p_query || '%'
    ORDER  BY code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_deactivate_classroom
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deactivate_classroom(
    p_classroom_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE classrooms
    SET    is_active = FALSE
    WHERE  id = p_classroom_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_classroom
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_classroom(
    p_classroom_id UUID
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
    WHERE  classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % asignación(es) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM classroom_availability WHERE classroom_id = p_classroom_id;
    DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_set_classroom_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_classroom_availability(
    p_classroom_id  UUID,
    p_day_of_week   day_of_week,
    p_start_time    TIME,
    p_end_time      TIME,
    p_is_available  BOOLEAN
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
    INSERT INTO classroom_availability(classroom_id, time_slot_id, is_available)
    VALUES (p_classroom_id, v_time_slot_id, COALESCE(p_is_available, TRUE))
    ON CONFLICT (classroom_id, time_slot_id) DO UPDATE
        SET is_available = EXCLUDED.is_available;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_classroom_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_classroom_availability(
    p_classroom_id UUID
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
    SELECT ts.day_of_week, ts.start_time, ts.end_time, ca.is_available
    FROM   classroom_availability ca
    JOIN   time_slots ts ON ts.id = ca.time_slot_id
    WHERE  ca.classroom_id = p_classroom_id
    ORDER  BY ts.day_of_week, ts.start_time;
END;
$$;

-- ----------------------------------------------------------
-- fn_clear_classroom_availability
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_clear_classroom_availability(
    p_classroom_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM classroom_availability
    WHERE  classroom_id = p_classroom_id;
END;
$$;