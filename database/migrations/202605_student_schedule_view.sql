DROP FUNCTION IF EXISTS fn_list_student_pending_courses(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_list_student_pending_courses(
    p_student_id  UUID,
    p_period_id   UUID
)
RETURNS TABLE (
    course_id            UUID,
    course_code          VARCHAR,
    course_name          VARCHAR,
    course_cycle         INTEGER,
    course_credits       INTEGER,
    course_weekly_hours  NUMERIC,
    required_components  INTEGER,
    sections             JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id UUID;
    v_student_cycle INTEGER;
BEGIN
    SELECT s.cycle INTO v_student_cycle
      FROM students s
     WHERE s.id = p_student_id;

    IF v_student_cycle IS NULL THEN
        RAISE EXCEPTION 'Estudiante no encontrado: %', p_student_id USING ERRCODE = 'P0001';
    END IF;

    SELECT ts.id INTO v_schedule_id
      FROM teaching_schedules ts
     WHERE ts.academic_period_id = p_period_id
       AND ts.status = 'CONFIRMED'
     LIMIT 1;

    -- Si no hay horario publicado, devolvemos los cursos pendientes
    -- sin secciones para que la UI muestre el estado vacío correcto.

    RETURN QUERY
    WITH courses_in_plan AS (
        SELECT c.*
          FROM courses c
         WHERE c.is_active = TRUE
           AND c.cycle <= v_student_cycle
           AND NOT EXISTS (
               SELECT 1 FROM student_completed_courses scc
                WHERE scc.student_id = p_student_id
                  AND scc.course_id  = c.id
           )
    ),
    component_counts AS (
        SELECT cc.course_id, COUNT(*)::INTEGER AS component_count
          FROM course_components cc
         WHERE cc.is_active = TRUE
         GROUP BY cc.course_id
    ),
    assignment_slots AS (
        SELECT csa.id                        AS assignment_id,
               csa.course_id,
               csa.course_component_id,
               csa.section_id,
               csa.teacher_id,
               cc.component_type             AS component_type,
               cc.sort_order                 AS component_order,
               cc.weekly_hours               AS component_weekly_hours,
               t.code                        AS teacher_code,
               t.full_name                   AS teacher_name,
               COALESCE(
                 JSONB_AGG(
                   JSONB_BUILD_OBJECT(
                     'slot_id',        cas.id,
                     'time_slot_id',   cas.time_slot_id,
                     'day_of_week',    ts.day_of_week,
                     'start_time',     TO_CHAR(cas.slot_start_time, 'HH24:MI'),
                     'end_time',       TO_CHAR(cas.slot_end_time,   'HH24:MI'),
                     'classroom_id',   cas.classroom_id,
                     'classroom_code', cl.code,
                     'classroom_name', cl.name
                   )
                   ORDER BY ts.day_of_week, cas.slot_start_time
                 ) FILTER (WHERE cas.id IS NOT NULL),
                 '[]'::JSONB
               )                              AS slots_json
          FROM course_schedule_assignments csa
          JOIN course_components cc ON cc.id = csa.course_component_id
          JOIN teachers          t  ON t.id  = csa.teacher_id
     LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
     LEFT JOIN time_slots ts ON ts.id = cas.time_slot_id
     LEFT JOIN classrooms cl ON cl.id = cas.classroom_id
         WHERE csa.teaching_schedule_id = v_schedule_id
           AND csa.assignment_status   <> 'CANCELLED'
         GROUP BY csa.id, csa.course_id, csa.course_component_id, csa.section_id,
                  csa.teacher_id, cc.component_type, cc.sort_order, cc.weekly_hours,
                  t.code, t.full_name
    ),
    section_components AS (
        SELECT a.course_id,
               a.section_id,
               cs.nrc,
               cs.section_number,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'assignment_id',         a.assignment_id,
                   'course_component_id',   a.course_component_id,
                   'component_type',        a.component_type,
                   'component_weekly_hours', a.component_weekly_hours,
                   'teacher_id',            a.teacher_id,
                   'teacher_code',          a.teacher_code,
                   'teacher_name',          a.teacher_name,
                   'slots',                 a.slots_json
                 )
                 ORDER BY a.component_order
               ) AS components_json
          FROM assignment_slots a
     LEFT JOIN course_sections cs ON cs.id = a.section_id
         WHERE a.section_id IS NOT NULL
         GROUP BY a.course_id, a.section_id, cs.nrc, cs.section_number
    ),
    course_sections_agg AS (
        SELECT sc.course_id,
               COALESCE(
                 JSONB_AGG(
                   JSONB_BUILD_OBJECT(
                     'section_id',     sc.section_id,
                     'nrc',            sc.nrc,
                     'section_number', sc.section_number,
                     'components',     sc.components_json
                   )
                   ORDER BY sc.section_number
                 ),
                 '[]'::JSONB
               ) AS sections_json
          FROM section_components sc
         GROUP BY sc.course_id
    )
    SELECT  cip.id,
            cip.code,
            cip.name,
            cip.cycle,
            cip.credits,
            cip.weekly_hours,
            COALESCE(cc.component_count, 0),
            COALESCE(csa.sections_json, '[]'::JSONB)
       FROM courses_in_plan cip
  LEFT JOIN component_counts   cc  ON cc.course_id  = cip.id
  LEFT JOIN course_sections_agg csa ON csa.course_id = cip.id
   ORDER BY cip.cycle, cip.code;
END;
$$;

DROP FUNCTION IF EXISTS fn_get_active_student_schedule(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_get_active_student_schedule(
    p_student_id  UUID,
    p_period_id   UUID
)
RETURNS TABLE (
    schedule_id          UUID,
    status               VARCHAR,
    items                JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    WITH active AS (
        SELECT ss.id, ss.status
          FROM student_schedules ss
         WHERE ss.student_id = p_student_id
           AND ss.academic_period_id = p_period_id
           AND ss.status IN ('DRAFT', 'CONFIRMED')
         LIMIT 1
    ),
    items AS (
        SELECT ssi.id              AS item_id,
               ssi.course_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'course_component_id',   ssic.course_component_id,
                   'course_assignment_id',  ssic.course_assignment_id
                 )
                 ORDER BY ssic.course_component_id
               ) FILTER (WHERE ssic.id IS NOT NULL) AS components_json
          FROM student_schedule_items ssi
          JOIN active a ON a.id = ssi.student_schedule_id
     LEFT JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
         WHERE ssi.item_status = 'ACTIVE'
         GROUP BY ssi.id, ssi.course_id
    )
    SELECT a.id,
           a.status::VARCHAR,
           COALESCE(
             (SELECT JSONB_AGG(
                       JSONB_BUILD_OBJECT(
                         'student_schedule_item_id', i.item_id,
                         'course_id',                i.course_id,
                         'components',               COALESCE(i.components_json, '[]'::JSONB)
                       )
                     ) FROM items i),
             '[]'::JSONB
           )
      FROM active a;
END;
$$;

DROP FUNCTION IF EXISTS fn_save_student_schedule(UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION fn_save_student_schedule(
    p_student_id   UUID,
    p_period_id    UUID,
    p_actor_id     UUID,
    p_items        JSONB
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id        UUID;
    v_published_id       UUID;
    v_existing_status    VARCHAR;
    v_existing_id        UUID;
    v_credit_limit       INTEGER;
    v_total_credits      INTEGER := 0;
    v_item               JSONB;
    v_course_id          UUID;
    v_assignment_id_text TEXT;
    v_assignment_id      UUID;
    v_required_components INTEGER;
    v_supplied_components INTEGER;
    v_invalid_count      INTEGER;
    v_completed_count    INTEGER;
    v_item_id            UUID;
    v_component_id       UUID;
BEGIN
    IF p_items IS NULL OR JSONB_TYPEOF(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Selección vacía o con formato inválido.' USING ERRCODE = 'P0001';
    END IF;

    SELECT s.credit_limit INTO v_credit_limit
      FROM students s
     WHERE s.id = p_student_id;

    IF v_credit_limit IS NULL THEN
        RAISE EXCEPTION 'Estudiante no encontrado: %', p_student_id USING ERRCODE = 'P0001';
    END IF;

    SELECT ts.id INTO v_published_id
      FROM teaching_schedules ts
     WHERE ts.academic_period_id = p_period_id
       AND ts.status = 'CONFIRMED'
     LIMIT 1;

    IF v_published_id IS NULL THEN
        RAISE EXCEPTION 'No hay horario publicado para el período.' USING ERRCODE = 'P0001';
    END IF;

    -- Bloquea si ya hay un CONFIRMED. Si hay DRAFT, lo reusamos.
    SELECT ss.id, ss.status INTO v_existing_id, v_existing_status
      FROM student_schedules ss
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_period_id
       AND ss.status IN ('DRAFT', 'CONFIRMED')
     LIMIT 1;

    IF v_existing_status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'El estudiante ya tiene un horario confirmado para el período.' USING ERRCODE = 'P0001';
    END IF;

    -- Validar y sumar créditos por curso
    FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
    LOOP
        v_course_id := (v_item ->> 'course_id')::UUID;

        IF v_course_id IS NULL THEN
            RAISE EXCEPTION 'course_id faltante en la selección.' USING ERRCODE = 'P0001';
        END IF;

        SELECT COUNT(*) INTO v_completed_count
          FROM student_completed_courses scc
         WHERE scc.student_id = p_student_id
           AND scc.course_id  = v_course_id;
        IF v_completed_count > 0 THEN
            RAISE EXCEPTION 'El curso % ya está aprobado.', v_course_id USING ERRCODE = 'P0001';
        END IF;

        SELECT COUNT(*) INTO v_required_components
          FROM course_components cc
         WHERE cc.course_id = v_course_id
           AND cc.is_active = TRUE;

        SELECT JSONB_ARRAY_LENGTH(v_item -> 'assignment_ids') INTO v_supplied_components;

        IF COALESCE(v_supplied_components, 0) < v_required_components THEN
            RAISE EXCEPTION 'Selección incompleta para el curso %. Requeridos % componente(s).',
                v_course_id, v_required_components USING ERRCODE = 'P0001';
        END IF;

        -- Validar que cada assignment pertenezca al horario publicado y al curso
        SELECT COUNT(*) INTO v_invalid_count
          FROM JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids') aid_text
     LEFT JOIN course_schedule_assignments csa ON csa.id = aid_text::UUID
         WHERE csa.id IS NULL
            OR csa.teaching_schedule_id <> v_published_id
            OR csa.course_id <> v_course_id
            OR csa.assignment_status = 'CANCELLED';

        IF v_invalid_count > 0 THEN
            RAISE EXCEPTION 'Asignaciones inválidas para el curso %.', v_course_id USING ERRCODE = 'P0001';
        END IF;

        SELECT v_total_credits + c.credits INTO v_total_credits
          FROM courses c WHERE c.id = v_course_id;
    END LOOP;

    IF v_total_credits > v_credit_limit THEN
        RAISE EXCEPTION 'La selección excede el límite de créditos (%/%).',
            v_total_credits, v_credit_limit USING ERRCODE = 'P0001';
    END IF;

    -- Borrar contenido previo del DRAFT o crear uno nuevo
    IF v_existing_id IS NOT NULL THEN
        v_schedule_id := v_existing_id;
        DELETE FROM student_schedule_items WHERE student_schedule_id = v_schedule_id;
        UPDATE student_schedules
           SET updated_at = NOW(), generated_by = p_actor_id
         WHERE id = v_schedule_id;
    ELSE
        INSERT INTO student_schedules (student_id, academic_period_id, status, generated_by)
        VALUES (p_student_id, p_period_id, 'DRAFT', p_actor_id)
        RETURNING id INTO v_schedule_id;
    END IF;

    -- Insertar items y components
    FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
    LOOP
        v_course_id := (v_item ->> 'course_id')::UUID;

        INSERT INTO student_schedule_items
            (student_schedule_id, student_id, course_id, item_status)
        VALUES (v_schedule_id, p_student_id, v_course_id, 'ACTIVE')
        RETURNING id INTO v_item_id;

        FOR v_assignment_id_text IN
            SELECT JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids')
        LOOP
            v_assignment_id := v_assignment_id_text::UUID;

            SELECT csa.course_component_id INTO v_component_id
              FROM course_schedule_assignments csa
             WHERE csa.id = v_assignment_id;

            INSERT INTO student_schedule_item_components
                (student_schedule_item_id, course_component_id, course_assignment_id, item_status)
            VALUES (v_item_id, v_component_id, v_assignment_id, 'ACTIVE');
        END LOOP;

        -- Vincular el item al primer assignment (compatibilidad con consultas existentes)
        UPDATE student_schedule_items
           SET course_assignment_id = (
                 SELECT aid::UUID
                   FROM JSONB_ARRAY_ELEMENTS_TEXT(v_item -> 'assignment_ids') aid
                  LIMIT 1
               )
         WHERE id = v_item_id;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;
