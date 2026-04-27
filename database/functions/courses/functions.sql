-- ============================================================
--  Funciones de gestión de courses
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_course
-- ----------------------------------------------------------
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

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    VALUES (v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active);

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

    INSERT INTO course_components(
        course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
    )
    SELECT v_course.id, 'GENERAL', v_course.weekly_hours, v_course.required_room_type, 1, v_course.is_active
    WHERE  v_course.id IS NOT NULL
      AND  NOT EXISTS (
          SELECT 1 FROM course_components cc WHERE cc.course_id = v_course.id
      );

    RETURN v_course;
END;
$$;

-- ----------------------------------------------------------
-- fn_replace_course_components
-- Reemplaza los componentes horarios de un curso.
-- p_components shape:
--   [{ "componentType": "GENERAL|THEORY|PRACTICE",
--      "weeklyHours": 4,
--      "requiredRoomType": "Aula",
--      "sortOrder": 1,
--      "isActive": true }]
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_replace_course_components(
    p_course_id   UUID,
    p_components  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_component      JSONB;
    v_component_id   UUID;
    v_saved_id       UUID;
    v_keep_ids       UUID[] := ARRAY[]::UUID[];
    v_type           VARCHAR(20);
    v_room_type      VARCHAR(100);
    v_weekly_hours   INTEGER;
    v_sort_order     INTEGER;
    v_is_active      BOOLEAN;
    v_general_count  INTEGER;
    v_specific_count INTEGER;
    v_hours_sum      INTEGER;
BEGIN
    IF p_components IS NULL OR jsonb_typeof(p_components) <> 'array'
       OR jsonb_array_length(p_components) = 0 THEN
        RAISE EXCEPTION 'El curso debe tener al menos un componente horario.'
            USING ERRCODE = '22023';
    END IF;

    -- Verificar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'El curso no existe.'
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) = 'GENERAL'),
           COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) IN ('THEORY', 'PRACTICE')),
           COALESCE(SUM((elem->>'weeklyHours')::INTEGER), 0)
    INTO   v_general_count, v_specific_count, v_hours_sum
    FROM   jsonb_array_elements(p_components) AS elem;

    IF v_general_count > 0 AND v_specific_count > 0 THEN
        RAISE EXCEPTION 'No se puede mezclar GENERAL con THEORY/PRACTICE.'
            USING ERRCODE = '22023';
    END IF;

    IF v_general_count > 1 THEN
        RAISE EXCEPTION 'Un curso solo puede tener un componente GENERAL.'
            USING ERRCODE = '22023';
    END IF;

    IF v_general_count = 0 AND v_specific_count = 0 THEN
        RAISE EXCEPTION 'Los componentes deben ser GENERAL, THEORY o PRACTICE.'
            USING ERRCODE = '22023';
    END IF;
    -- Nota: no se valida que v_hours_sum coincida con weekly_hours del curso,
    -- ya que ambos se gestionan de forma independiente (modal Horarios vs formulario del curso).

    -- Desplazar sort_order de los componentes existentes para evitar conflictos de unicidad
    -- durante el upsert (ej. cambio GENERAL → THEORY+PRACTICE ambos empezando en sort_order=1)
    UPDATE course_components
    SET    sort_order = sort_order + 10000
    WHERE  course_id = p_course_id;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_component_id := NULLIF(v_component->>'id', '')::UUID;
        v_type := UPPER(TRIM(v_component->>'componentType'));
        v_weekly_hours := (v_component->>'weeklyHours')::INTEGER;
        v_room_type := NULLIF(TRIM(COALESCE(v_component->>'requiredRoomType', '')), '');
        v_sort_order := COALESCE((v_component->>'sortOrder')::INTEGER, 1);
        v_is_active := COALESCE((v_component->>'isActive')::BOOLEAN, TRUE);

        IF v_type NOT IN ('GENERAL', 'THEORY', 'PRACTICE') THEN
            RAISE EXCEPTION 'Tipo de componente inválido: %', v_type
                USING ERRCODE = '22023';
        END IF;

        IF v_weekly_hours < 1 THEN
            RAISE EXCEPTION 'Las horas del componente deben ser mayores o iguales a 1.'
                USING ERRCODE = '22023';
        END IF;

        IF v_room_type IS NULL THEN
            RAISE EXCEPTION 'El tipo de aula del componente es obligatorio.'
                USING ERRCODE = '22023';
        END IF;

        IF v_component_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM   course_components cc
            WHERE  cc.id = v_component_id
              AND  cc.course_id = p_course_id
        ) THEN
            UPDATE course_components
            SET    component_type     = v_type,
                   weekly_hours       = v_weekly_hours,
                   required_room_type = v_room_type,
                   sort_order         = v_sort_order,
                   is_active          = v_is_active,
                   updated_at         = NOW()
            WHERE  id = v_component_id
            RETURNING id INTO v_saved_id;
        ELSIF EXISTS (
            SELECT 1
            FROM   course_components cc
            WHERE  cc.course_id = p_course_id
              AND  cc.component_type = v_type
        ) THEN
            UPDATE course_components
            SET    weekly_hours       = v_weekly_hours,
                   required_room_type = v_room_type,
                   sort_order         = v_sort_order,
                   is_active          = v_is_active,
                   updated_at         = NOW()
            WHERE  course_id = p_course_id
              AND  component_type = v_type
            RETURNING id INTO v_saved_id;
        ELSE
            INSERT INTO course_components(
                course_id, component_type, weekly_hours, required_room_type,
                sort_order, is_active
            )
            VALUES (
                p_course_id, v_type, v_weekly_hours, v_room_type,
                v_sort_order, v_is_active
            )
            RETURNING id INTO v_saved_id;
        END IF;

        v_keep_ids := array_append(v_keep_ids, v_saved_id);
    END LOOP;

    DELETE FROM course_components
    WHERE  course_id = p_course_id
      AND  NOT (id = ANY(v_keep_ids));
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
    WHERE  unaccent(LOWER(code)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
       OR  unaccent(LOWER(name)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
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
    v_assignments_count   INTEGER;
    v_prereq_of_count     INTEGER;
    v_completed_count     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments WHERE course_id = p_course_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % asignación(es) de horario y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
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
-- fn_list_course_components
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_course_components(
    p_course_id UUID
)
RETURNS TABLE(
    id                 UUID,
    component_type     VARCHAR(20),
    weekly_hours       INTEGER,
    required_room_type VARCHAR(100),
    sort_order         INTEGER,
    is_active          BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.id, cc.component_type, cc.weekly_hours, cc.required_room_type,
           cc.sort_order, cc.is_active
    FROM   course_components cc
    WHERE  cc.course_id = p_course_id
    ORDER  BY cc.sort_order ASC, cc.component_type ASC;
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
    WHERE  unaccent(LOWER(c.code)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
       OR  unaccent(LOWER(c.name)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
    ORDER  BY c.code ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;
-- ----------------------------------------------------------
-- fn_find_courses_by_codes
-- Lookup courses by a list of codes (used for prereq hydration)
-- ----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_find_courses_by_codes(VARCHAR[]);

CREATE OR REPLACE FUNCTION fn_find_courses_by_codes(
    p_codes VARCHAR[]
)
RETURNS SETOF courses
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF p_codes IS NULL OR array_length(p_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT *
    FROM   courses
    WHERE  code = ANY(p_codes)
    ORDER  BY code ASC;
END;
$$;
