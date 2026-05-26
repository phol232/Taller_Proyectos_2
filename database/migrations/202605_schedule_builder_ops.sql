DROP FUNCTION IF EXISTS fn_list_active_time_slots();

CREATE OR REPLACE FUNCTION fn_list_active_time_slots()
RETURNS TABLE (
    id          UUID,
    day_of_week VARCHAR,
    start_time  TIME,
    end_time    TIME,
    slot_order  INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ts.id,
           ts.day_of_week::VARCHAR,
           ts.start_time,
           ts.end_time,
           ts.slot_order
      FROM time_slots ts
     WHERE ts.is_active = TRUE
       AND ts.start_time >= TIME '07:00'
       AND ts.end_time   <= TIME '22:30'
     ORDER BY ts.day_of_week, ts.slot_order;
END;
$$;

DROP FUNCTION IF EXISTS fn_builder_list_assignments(UUID);

CREATE OR REPLACE FUNCTION fn_builder_list_assignments(p_schedule_id UUID)
RETURNS TABLE (
    assignment_id        UUID,
    course_id            UUID,
    course_code          VARCHAR,
    course_name          VARCHAR,
    course_component_id  UUID,
    component_type       VARCHAR,
    component_weekly_hours NUMERIC,
    teacher_id           UUID,
    teacher_code         VARCHAR,
    teacher_name         VARCHAR,
    section_id           UUID,
    section_nrc          VARCHAR,
    assignment_status    VARCHAR,
    assigned_hours       NUMERIC,
    is_complete          BOOLEAN,
    slots                JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT csa.id,
           c.id,
           c.code,
           c.name,
           cc.id,
           cc.component_type,
           cc.weekly_hours,
           t.id,
           t.code,
           t.full_name,
           cs.id,
           cs.nrc::VARCHAR,
           csa.assignment_status,
           COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)::NUMERIC AS assigned_hours,
           COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)::NUMERIC >= cc.weekly_hours AS is_complete,
           COALESCE(
             JSONB_AGG(
               JSONB_BUILD_OBJECT(
                 'slot_id',         cas.id,
                 'time_slot_id',    cas.time_slot_id,
                 'day_of_week',     ts.day_of_week,
                 'start_time',      TO_CHAR(cas.slot_start_time, 'HH24:MI'),
                 'end_time',        TO_CHAR(cas.slot_end_time,   'HH24:MI'),
                 'classroom_id',    cas.classroom_id,
                 'classroom_code',  cl.code,
                 'classroom_name',  cl.name
               )
               ORDER BY ts.day_of_week, cas.slot_start_time
             ) FILTER (WHERE cas.id IS NOT NULL),
             '[]'::JSONB
           ) AS slots
      FROM course_schedule_assignments csa
      JOIN courses             c  ON c.id  = csa.course_id
      JOIN course_components   cc ON cc.id = csa.course_component_id
      JOIN teachers            t  ON t.id  = csa.teacher_id
 LEFT JOIN course_sections     cs ON cs.id = csa.section_id
 LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
 LEFT JOIN time_slots          ts ON ts.id = cas.time_slot_id
 LEFT JOIN classrooms          cl ON cl.id = cas.classroom_id
     WHERE csa.teaching_schedule_id = p_schedule_id
       AND csa.assignment_status <> 'CANCELLED'
  GROUP BY csa.id, c.id, c.code, c.name, cc.id, cc.component_type, cc.weekly_hours,
           t.id, t.code, t.full_name, cs.id, cs.nrc, csa.assignment_status
  ORDER BY c.code, cc.sort_order;
END;
$$;


DROP FUNCTION IF EXISTS fn_builder_validate_slot(UUID, UUID, UUID, UUID, UUID, TIME, TIME, UUID);

CREATE OR REPLACE FUNCTION fn_builder_validate_slot(
    p_schedule_id        UUID,
    p_assignment_id      UUID,
    p_teacher_id         UUID,
    p_classroom_id       UUID,
    p_time_slot_id       UUID,
    p_start_time         TIME,
    p_end_time           TIME,
    p_exclude_slot_id    UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_type   VARCHAR,
    resource_id     UUID,
    message         VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT 'TEACHER_BUSY'::VARCHAR,
           cas.id,
           ('El docente ya tiene una clase asignada en ese horario.')::VARCHAR
      FROM course_assignment_slots cas
     WHERE cas.teaching_schedule_id = p_schedule_id
       AND cas.teacher_id          = p_teacher_id
       AND cas.time_slot_id        = p_time_slot_id
       AND cas.slot_start_time     = p_start_time
       AND cas.slot_end_time       = p_end_time
       AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);

    RETURN QUERY
    SELECT 'CLASSROOM_BUSY'::VARCHAR,
           cas.id,
           ('El aula ya está ocupada en ese horario.')::VARCHAR
      FROM course_assignment_slots cas
     WHERE cas.teaching_schedule_id = p_schedule_id
       AND cas.classroom_id        = p_classroom_id
       AND cas.time_slot_id        = p_time_slot_id
       AND cas.slot_start_time     = p_start_time
       AND cas.slot_end_time       = p_end_time
       AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);

    IF p_assignment_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 'DUPLICATE'::VARCHAR,
               cas.id,
               ('La asignación ya contiene esa franja.')::VARCHAR
          FROM course_assignment_slots cas
         WHERE cas.course_assignment_id = p_assignment_id
           AND cas.time_slot_id        = p_time_slot_id
           AND cas.slot_start_time     = p_start_time
           AND cas.slot_end_time       = p_end_time
           AND (p_exclude_slot_id IS NULL OR cas.id <> p_exclude_slot_id);
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS fn_builder_remove_slot(UUID);

CREATE OR REPLACE FUNCTION fn_builder_remove_slot(p_slot_id UUID)
RETURNS TABLE (
    assignment_id              UUID,
    assignment_left_incomplete BOOLEAN,
    assigned_hours             NUMERIC,
    required_hours             NUMERIC
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignment_id UUID;
    v_required      NUMERIC;
    v_assigned      NUMERIC;
BEGIN
    SELECT cas.course_assignment_id
      INTO v_assignment_id
      FROM course_assignment_slots cas
     WHERE cas.id = p_slot_id;

    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'Franja no encontrada: %', p_slot_id USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM course_assignment_slots WHERE id = p_slot_id;

    SELECT cc.weekly_hours
      INTO v_required
      FROM course_schedule_assignments csa
      JOIN course_components cc ON cc.id = csa.course_component_id
     WHERE csa.id = v_assignment_id;

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (cas.slot_end_time - cas.slot_start_time)) / 3600.0), 0)
      INTO v_assigned
      FROM course_assignment_slots cas
     WHERE cas.course_assignment_id = v_assignment_id;

    UPDATE course_schedule_assignments
       SET updated_at = NOW()
     WHERE id = v_assignment_id;

    RETURN QUERY SELECT v_assignment_id, v_assigned < v_required, v_assigned::NUMERIC, v_required::NUMERIC;
END;
$$;

DROP FUNCTION IF EXISTS fn_builder_remove_assignment(UUID);

CREATE OR REPLACE FUNCTION fn_builder_remove_assignment(p_assignment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT assignment_status INTO v_status
      FROM course_schedule_assignments
     WHERE id = p_assignment_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Asignación no encontrada: %', p_assignment_id USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM course_schedule_assignments WHERE id = p_assignment_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_builder_add_slot(UUID, UUID, UUID, UUID, TIME, TIME);

CREATE OR REPLACE FUNCTION fn_builder_add_slot(
    p_assignment_id  UUID,
    p_classroom_id   UUID,
    p_time_slot_id   UUID,
    p_slot_start     TIME,
    p_slot_end       TIME
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_slot_id            UUID;
    v_schedule_id        UUID;
    v_course_id          UUID;
    v_course_component_id UUID;
    v_teacher_id         UUID;
BEGIN
    SELECT teaching_schedule_id, course_id, course_component_id, teacher_id
      INTO v_schedule_id, v_course_id, v_course_component_id, v_teacher_id
      FROM course_schedule_assignments
     WHERE id = p_assignment_id;

    IF v_schedule_id IS NULL THEN
        RAISE EXCEPTION 'Asignación no encontrada: %', p_assignment_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO course_assignment_slots (
        course_assignment_id, teaching_schedule_id, course_id, course_component_id,
        teacher_id, classroom_id, time_slot_id, slot_start_time, slot_end_time
    )
    VALUES (
        p_assignment_id, v_schedule_id, v_course_id, v_course_component_id,
        v_teacher_id, p_classroom_id, p_time_slot_id, p_slot_start, p_slot_end
    )
    RETURNING id INTO v_slot_id;

    UPDATE course_schedule_assignments
       SET updated_at = NOW()
     WHERE id = p_assignment_id;

    RETURN v_slot_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_builder_add_course(UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION fn_builder_add_course(
    p_schedule_id          UUID,
    p_course_component_id  UUID,
    p_teacher_id           UUID,
    p_section_id           UUID,
    p_slots                JSONB
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_course_id      UUID;
    v_assignment_id  UUID;
    v_slot           JSONB;
BEGIN
    SELECT cc.course_id
      INTO v_course_id
      FROM course_components cc
     WHERE cc.id = p_course_component_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Componente de curso no encontrado: %', p_course_component_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO course_schedule_assignments (
        teaching_schedule_id, course_id, course_component_id, teacher_id,
        section_id, assignment_status
    )
    VALUES (
        p_schedule_id, v_course_id, p_course_component_id, p_teacher_id,
        p_section_id, 'DRAFT'
    )
    RETURNING id INTO v_assignment_id;

    IF p_slots IS NOT NULL AND JSONB_TYPEOF(p_slots) = 'array' THEN
        FOR v_slot IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_slots)
        LOOP
            INSERT INTO course_assignment_slots (
                course_assignment_id, teaching_schedule_id, course_id, course_component_id,
                teacher_id, classroom_id, time_slot_id, slot_start_time, slot_end_time
            )
            VALUES (
                v_assignment_id, p_schedule_id, v_course_id, p_course_component_id,
                p_teacher_id,
                (v_slot ->> 'classroom_id')::UUID,
                (v_slot ->> 'time_slot_id')::UUID,
                (v_slot ->> 'start_time')::TIME,
                (v_slot ->> 'end_time')::TIME
            );
        END LOOP;
    END IF;

    RETURN v_assignment_id;
END;
$$;
