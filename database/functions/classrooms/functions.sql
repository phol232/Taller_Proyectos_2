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
    FROM   course_assignment_slots
    WHERE  classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % franja(s) asignada(s) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM classroom_courses WHERE classroom_id = p_classroom_id;
    DELETE FROM classroom_availability WHERE classroom_id = p_classroom_id;
    DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_classroom_courses
-- Agrega en una operación varios cursos que se pueden dictar en un aula.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_classroom_courses(
    p_classroom_id UUID,
    p_course_ids   UUID[]
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

    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT p_classroom_id, c.id
    FROM   courses c
    WHERE  c.id = ANY(p_course_ids)
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_classroom_courses_by_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_classroom_courses_by_codes(
    p_classroom_id UUID,
    p_course_codes VARCHAR[]
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

    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT p_classroom_id, c.id
    FROM   courses c
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------
-- fn_remove_classroom_courses
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_remove_classroom_courses(
    p_classroom_id UUID,
    p_course_ids   UUID[]
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

    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id
       AND course_id = ANY(p_course_ids);
END;
$$;

-- ----------------------------------------------------------
-- fn_remove_classroom_courses_by_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_remove_classroom_courses_by_codes(
    p_classroom_id UUID,
    p_course_codes VARCHAR[]
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

    DELETE FROM classroom_courses cc
    USING courses c
    WHERE cc.classroom_id = p_classroom_id
      AND cc.course_id = c.id
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
-- fn_set_classroom_courses
-- Reemplaza en una operación los cursos que admite un aula.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_classroom_courses(
    p_classroom_id UUID,
    p_course_ids   UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id;

    PERFORM fn_add_classroom_courses(p_classroom_id, p_course_ids);
END;
$$;

-- ----------------------------------------------------------
-- fn_set_classroom_courses_by_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_classroom_courses_by_codes(
    p_classroom_id UUID,
    p_course_codes VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM classroom_courses
    WHERE  classroom_id = p_classroom_id;

    PERFORM fn_add_classroom_courses_by_codes(p_classroom_id, p_course_codes);
END;
$$;

-- ----------------------------------------------------------
-- fn_list_classroom_course_codes
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_classroom_course_codes(
    p_classroom_id UUID
)
RETURNS TABLE(course_code VARCHAR(50))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   classroom_courses cc
    JOIN   courses c ON c.id = cc.course_id
    WHERE  cc.classroom_id = p_classroom_id
    ORDER  BY c.code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_classroom_courses
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_classroom_courses(
    p_classroom_id UUID
)
RETURNS TABLE(
    course_id    UUID,
    course_code  VARCHAR(50),
    course_name  VARCHAR(255),
    cycle        INTEGER,
    credits      INTEGER,
    weekly_hours INTEGER,
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

-- ----------------------------------------------------------
-- fn_list_course_classroom_ids
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_course_classroom_ids(
    p_course_id UUID
)
RETURNS TABLE(classroom_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cl.id
    FROM   classroom_courses cc
    JOIN   classrooms cl ON cl.id = cc.classroom_id
    WHERE  cc.course_id = p_course_id
    ORDER  BY cl.code ASC;
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

-- ----------------------------------------------------------
-- fn_list_classrooms_paged
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_search_classrooms_paged
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_list_classroom_course_component_ids
-- Retorna los IDs de los course_components asignados a un aula.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_classroom_course_component_ids(
    p_classroom_id UUID
)
RETURNS TABLE(course_component_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ccc.course_component_id
    FROM   classroom_course_components ccc
    WHERE  ccc.classroom_id = p_classroom_id
    ORDER  BY ccc.course_component_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_set_classroom_course_components
-- Reemplaza en una operación los componentes asignados a un aula.
-- Los course_id correspondientes se sincronizan en classroom_courses
-- automáticamente para mantener consistencia.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_classroom_course_components(
    p_classroom_id  UUID,
    p_component_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    -- Borrar asignaciones anteriores de componentes
    DELETE FROM classroom_course_components
    WHERE  classroom_id = p_classroom_id;

    IF p_component_ids IS NULL OR array_length(p_component_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Insertar nuevas asignaciones de componentes
    INSERT INTO classroom_course_components(classroom_id, course_component_id)
    SELECT p_classroom_id, comp.id
    FROM   course_components comp
    WHERE  comp.id = ANY(p_component_ids)
    ON CONFLICT (classroom_id, course_component_id) DO NOTHING;

    -- Sincronizar classroom_courses: agregar los cursos padre de los componentes
    INSERT INTO classroom_courses(classroom_id, course_id)
    SELECT DISTINCT p_classroom_id, comp.course_id
    FROM   course_components comp
    WHERE  comp.id = ANY(p_component_ids)
    ON CONFLICT (classroom_id, course_id) DO NOTHING;
END;
$$;
