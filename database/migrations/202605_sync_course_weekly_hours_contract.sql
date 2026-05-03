-- Sincroniza la fuente de verdad del repo con el contrato real ya aplicado:
-- weekly_hours en courses y course_components debe ser NUMERIC(3,1).
-- Además re-publica las funciones afectadas para evitar truncamientos.

BEGIN;

ALTER TABLE courses
    ALTER COLUMN weekly_hours TYPE NUMERIC(3,1) USING weekly_hours::NUMERIC(3,1);

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS courses_weekly_hours_check;

ALTER TABLE courses
    ADD CONSTRAINT courses_weekly_hours_check CHECK (weekly_hours > 0);

ALTER TABLE course_components
    ALTER COLUMN weekly_hours TYPE NUMERIC(3,1) USING weekly_hours::NUMERIC(3,1);

ALTER TABLE course_components
    DROP CONSTRAINT IF EXISTS course_components_weekly_hours_check;

ALTER TABLE course_components
    ADD CONSTRAINT course_components_weekly_hours_check CHECK (weekly_hours > 0);

DROP FUNCTION IF EXISTS fn_create_course(VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_create_course(VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, NUMERIC(3,1), VARCHAR(100), BOOLEAN);

CREATE OR REPLACE FUNCTION fn_create_course(
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_cycle              INTEGER,
    p_credits            INTEGER,
    p_required_credits   INTEGER,
    p_weekly_hours       NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR(100), BOOLEAN);
DROP FUNCTION IF EXISTS fn_update_course(UUID, VARCHAR(50), VARCHAR(255), INTEGER, INTEGER, INTEGER, NUMERIC(3,1), VARCHAR(100), BOOLEAN);

CREATE OR REPLACE FUNCTION fn_update_course(
    p_course_id          UUID,
    p_code               VARCHAR(50),
    p_name               VARCHAR(255),
    p_cycle              INTEGER,
    p_credits            INTEGER,
    p_required_credits   INTEGER,
    p_weekly_hours       NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_replace_course_components(UUID, JSONB);

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
    v_weekly_hours   NUMERIC(3,1);
    v_sort_order     INTEGER;
    v_is_active      BOOLEAN;
    v_general_count  INTEGER;
    v_specific_count INTEGER;
    v_hours_sum      NUMERIC(6,1);
BEGIN
    IF p_components IS NULL OR jsonb_typeof(p_components) <> 'array'
       OR jsonb_array_length(p_components) = 0 THEN
        RAISE EXCEPTION 'El curso debe tener al menos un componente horario.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'El curso no existe.'
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) = 'GENERAL'),
           COUNT(*) FILTER (WHERE UPPER(TRIM(elem->>'componentType')) IN ('THEORY', 'PRACTICE')),
           COALESCE(SUM((elem->>'weeklyHours')::NUMERIC(3,1)), 0)
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

    UPDATE course_components
    SET    sort_order = sort_order + 10000
    WHERE  course_id = p_course_id;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_component_id := NULLIF(v_component->>'id', '')::UUID;
        v_type := UPPER(TRIM(v_component->>'componentType'));
        v_weekly_hours := (v_component->>'weeklyHours')::NUMERIC(3,1);
        v_room_type := NULLIF(TRIM(COALESCE(v_component->>'requiredRoomType', '')), '');
        v_sort_order := COALESCE((v_component->>'sortOrder')::INTEGER, 1);
        v_is_active := COALESCE((v_component->>'isActive')::BOOLEAN, TRUE);

        IF v_type NOT IN ('GENERAL', 'THEORY', 'PRACTICE') THEN
            RAISE EXCEPTION 'Tipo de componente inválido: %', v_type
                USING ERRCODE = '22023';
        END IF;

        IF v_weekly_hours <= 0 THEN
            RAISE EXCEPTION 'Las horas del componente deben ser mayores a 0.'
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

DROP FUNCTION IF EXISTS fn_list_course_components(UUID);

CREATE OR REPLACE FUNCTION fn_list_course_components(
    p_course_id UUID
)
RETURNS TABLE(
    id                 UUID,
    component_type     VARCHAR(20),
    weekly_hours       NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_list_courses_paged(INTEGER, INTEGER);

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
    weekly_hours         NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_search_courses_paged(VARCHAR(255), INTEGER, INTEGER);

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
    weekly_hours         NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_list_classroom_courses(UUID);

CREATE OR REPLACE FUNCTION fn_list_classroom_courses(
    p_classroom_id UUID
)
RETURNS TABLE(
    course_id    UUID,
    course_code  VARCHAR(50),
    course_name  VARCHAR(255),
    cycle        INTEGER,
    credits      INTEGER,
    weekly_hours NUMERIC(3,1),
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

DROP FUNCTION IF EXISTS fn_solver_list_active_courses();

CREATE OR REPLACE FUNCTION fn_solver_list_active_courses()
RETURNS TABLE (
    id                 UUID,
    code               VARCHAR,
    name               VARCHAR,
    cycle              INTEGER,
    credits            INTEGER,
    required_credits   INTEGER,
    weekly_hours       NUMERIC(3,1),
    required_room_type VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.cycle, c.credits, c.required_credits,
           c.weekly_hours, c.required_room_type
      FROM courses c
     WHERE c.is_active = TRUE;
END;
$$;

DROP FUNCTION IF EXISTS fn_solver_list_active_course_components();

CREATE OR REPLACE FUNCTION fn_solver_list_active_course_components()
RETURNS TABLE (
    id                 UUID,
    course_id          UUID,
    component_type     VARCHAR,
    weekly_hours       NUMERIC(3,1),
    required_room_type VARCHAR,
    sort_order         INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.id,
           cc.course_id,
           cc.component_type,
           cc.weekly_hours,
           cc.required_room_type,
           cc.sort_order
      FROM course_components cc
      JOIN courses c ON c.id = cc.course_id
     WHERE c.is_active = TRUE
       AND cc.is_active = TRUE
     ORDER BY c.code ASC, cc.sort_order ASC;
END;
$$;

COMMIT;
