-- ============================================================
--  Funciones PL/pgSQL para el microservicio Solver CSP
--  Cubren: lectura de inputs, creación/cierre de solver_runs,
--          registro de conflictos, persistencia de horarios
--          docente y estudiantil.
--  Convención: fn_solver_<verbo>_<entidad>
-- ============================================================

-- ============================================================
--  LECTURAS
-- ============================================================

-- -----------------------------------------------------------
-- fn_solver_get_period
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_get_period(p_period_id UUID)
RETURNS TABLE (
    id                  UUID,
    max_student_credits INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ap.id, ap.max_student_credits
      FROM academic_periods ap
     WHERE ap.id = p_period_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_active_courses
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_active_courses()
RETURNS TABLE (
    id                 UUID,
    code               VARCHAR,
    name               VARCHAR,
    cycle              INTEGER,
    credits            INTEGER,
    required_credits   INTEGER,
    weekly_hours       INTEGER,
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

-- -----------------------------------------------------------
-- fn_solver_list_active_course_components
-- Componentes horarios activos. Son la unidad asignable de Fase 1.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_active_course_components();

CREATE OR REPLACE FUNCTION fn_solver_list_active_course_components()
RETURNS TABLE (
    id                 UUID,
    course_id          UUID,
    component_type     VARCHAR,
    weekly_hours       INTEGER,
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

-- -----------------------------------------------------------
-- fn_solver_list_active_teachers
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_active_teachers()
RETURNS TABLE (
    id        UUID,
    code      VARCHAR,
    full_name VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.code, t.full_name
      FROM teachers t
     WHERE t.is_active = TRUE;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_active_classrooms
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_active_classrooms();

CREATE OR REPLACE FUNCTION fn_solver_list_active_classrooms()
RETURNS TABLE (
    id            UUID,
    code          VARCHAR,
    name          VARCHAR,
    capacity      INTEGER,
    room_type     VARCHAR,
    building_code VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.code, r.name, r.capacity, r.room_type, r.building_code
      FROM classrooms r
     WHERE r.is_active = TRUE;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_active_time_slots
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_active_time_slots()
RETURNS TABLE (
    id          UUID,
    day_of_week TEXT,
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
           ts.day_of_week::TEXT,
           ts.start_time,
           ts.end_time,
           ts.slot_order
      FROM time_slots ts
     WHERE ts.is_active = TRUE
     ORDER BY ts.day_of_week, ts.slot_order;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_teacher_courses
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_teacher_courses()
RETURNS TABLE (
    teacher_id UUID,
    course_id  UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY SELECT tc.teacher_id, tc.course_id FROM teacher_courses tc;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_teacher_course_components
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_teacher_course_components();

CREATE OR REPLACE FUNCTION fn_solver_list_teacher_course_components()
RETURNS TABLE (
    teacher_id          UUID,
    course_component_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT tcc.teacher_id, tcc.course_component_id
      FROM teacher_course_components tcc;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_classroom_courses
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_classroom_courses()
RETURNS TABLE (
    classroom_id UUID,
    course_id    UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY SELECT cc.classroom_id, cc.course_id FROM classroom_courses cc;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_teacher_availability
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_teacher_availability()
RETURNS TABLE (
    teacher_id   UUID,
    time_slot_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ta.teacher_id, ta.time_slot_id
      FROM teacher_availability ta
     WHERE ta.is_available = TRUE;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_classroom_availability
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_classroom_availability()
RETURNS TABLE (
    classroom_id UUID,
    time_slot_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ca.classroom_id, ca.time_slot_id
      FROM classroom_availability ca
     WHERE ca.is_available = TRUE;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_course_prerequisites
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_course_prerequisites()
RETURNS TABLE (
    course_id              UUID,
    prerequisite_course_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cp.course_id, cp.prerequisite_course_id FROM course_prerequisites cp;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_course_corequisites
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_course_corequisites()
RETURNS TABLE (
    course_id      UUID,
    corequisite_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.course_id, cc.corequisite_id FROM course_corequisites cc;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_building_travel_times
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_building_travel_times()
RETURNS TABLE (
    building_a VARCHAR,
    building_b VARCHAR,
    minutes    INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.building_a, b.building_b, b.minutes FROM building_travel_times b;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_get_confirmed_teaching_schedule
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_get_confirmed_teaching_schedule(p_period_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id
      FROM teaching_schedules
     WHERE academic_period_id = p_period_id
       AND status = 'CONFIRMED'
     LIMIT 1;
    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_students
--  p_student_id NULL => todos los activos. No NULL => uno solo.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_students(UUID);

CREATE OR REPLACE FUNCTION fn_solver_list_students(p_student_id UUID DEFAULT NULL)
RETURNS TABLE (
    id              UUID,
    code            VARCHAR,
    full_name       VARCHAR,
    cycle           INTEGER,
    credit_limit    INTEGER,
    gpa             NUMERIC,
    preferred_shift VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id,
           s.code,
           s.full_name,
           s.cycle,
           s.credit_limit,
           s.gpa,
           p.preferred_shift
      FROM students s
 LEFT JOIN profiles p ON p.user_id = s.user_id
     WHERE s.is_active = TRUE
       AND (p_student_id IS NULL OR s.id = p_student_id);
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_completed_courses
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_list_completed_courses(p_student_ids UUID[])
RETURNS TABLE (
    student_id UUID,
    course_id  UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT scc.student_id, scc.course_id
      FROM student_completed_courses scc
     WHERE scc.approved_at IS NOT NULL
       AND (p_student_ids IS NULL OR scc.student_id = ANY(p_student_ids));
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_offer_vacancies
--  Devuelve todas las ofertas vivas (DRAFT/CONFIRMED) de un
--  teaching_schedule, con los time_slot_ids agregados y el aula
--  común a todos los slots de la asignación.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_offer_vacancies(UUID);

CREATE OR REPLACE FUNCTION fn_solver_list_offer_vacancies(p_teaching_schedule_id UUID)
RETURNS TABLE (
    assignment_id  UUID,
    course_id      UUID,
    course_component_id UUID,
    teacher_id     UUID,
    classroom_id   UUID,
    max_capacity   INTEGER,
    enrolled_count INTEGER,
    time_slot_ids  UUID[]
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT csa.id,
           csa.course_id,
           csa.course_component_id,
           csa.teacher_id,
           (SELECT cas.classroom_id
              FROM course_assignment_slots cas
             WHERE cas.course_assignment_id = csa.id
             LIMIT 1),
           csa.max_capacity,
           csa.enrolled_count,
           COALESCE(
             (SELECT array_agg(cas.time_slot_id ORDER BY cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::UUID[]
           )
      FROM course_schedule_assignments csa
     WHERE csa.teaching_schedule_id = p_teaching_schedule_id
       AND csa.assignment_status IN ('DRAFT', 'CONFIRMED');
END;
$$;


-- ============================================================
--  ESCRITURAS — solver_runs / solver_run_conflicts
-- ============================================================

-- -----------------------------------------------------------
-- fn_solver_get_run
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_get_run(p_run_id UUID)
RETURNS TABLE (
    id                 UUID,
    run_type           VARCHAR,
    academic_period_id UUID,
    student_id         UUID,
    status             VARCHAR,
    requested_by       UUID,
    time_limit_ms      INTEGER,
    input_hash         VARCHAR,
    result_summary     TEXT,
    started_at         TIMESTAMPTZ,
    finished_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT sr.id, sr.run_type, sr.academic_period_id, sr.student_id,
           sr.status, sr.requested_by, sr.time_limit_ms, sr.input_hash,
           sr.result_summary, sr.started_at, sr.finished_at, sr.created_at
      FROM solver_runs sr
     WHERE sr.id = p_run_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_run_conflicts
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_run_conflicts(UUID);

CREATE OR REPLACE FUNCTION fn_solver_list_run_conflicts(p_run_id UUID)
RETURNS TABLE (
    conflict_type VARCHAR,
    resource_type VARCHAR,
    resource_id   UUID,
    course_id     UUID,
    time_slot_id  UUID,
    message       TEXT,
    details_json  JSONB,
    created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT src.conflict_type, src.resource_type, src.resource_id,
           src.course_id, src.time_slot_id, src.message, src.details_json,
           src.created_at
      FROM solver_run_conflicts src
     WHERE src.solver_run_id = p_run_id
     ORDER BY src.created_at ASC;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_create_run
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_create_run(
    p_run_type           VARCHAR,
    p_academic_period_id UUID,
    p_student_id         UUID,
    p_requested_by       UUID,
    p_time_limit_ms      INTEGER,
    p_input_hash         VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO solver_runs (run_type, academic_period_id, student_id,
                             status, requested_by, time_limit_ms, input_hash,
                             started_at)
    VALUES (UPPER(TRIM(p_run_type)),
            p_academic_period_id,
            p_student_id,
            'RUNNING',
            p_requested_by,
            COALESCE(p_time_limit_ms, 30000),
            p_input_hash,
            NOW())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_finish_run
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_finish_run(
    p_run_id  UUID,
    p_status  VARCHAR,
    p_summary TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE solver_runs
       SET status         = UPPER(TRIM(p_status)),
           result_summary = p_summary,
           finished_at    = NOW(),
           updated_at     = NOW()
     WHERE id = p_run_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_set_run_input_hash
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_set_run_input_hash(
    p_run_id UUID,
    p_hash   VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE solver_runs
       SET input_hash = p_hash,
           updated_at = NOW()
     WHERE id = p_run_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_add_conflicts
--  Inserta múltiples conflictos en una sola llamada.
--  p_conflicts es un JSONB array con el shape:
--   [{
--     "conflict_type": "...",
--     "resource_type": "..." | null,
--     "resource_id":   "uuid" | null,
--     "course_id":     "uuid" | null,
--     "time_slot_id":  "uuid" | null,
--     "message":       "...",
--     "details":       {} | null
--   }, ...]
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_add_conflicts(
    p_run_id    UUID,
    p_conflicts JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_conflicts IS NULL OR jsonb_array_length(p_conflicts) = 0 THEN
        RETURN 0;
    END IF;

    INSERT INTO solver_run_conflicts (
        solver_run_id, conflict_type, resource_type, resource_id,
        course_id, time_slot_id, message, details_json
    )
    SELECT p_run_id,
           NULLIF(elem->>'conflict_type', ''),
           NULLIF(elem->>'resource_type', ''),
           NULLIF(elem->>'resource_id', '')::UUID,
           NULLIF(elem->>'course_id', '')::UUID,
           NULLIF(elem->>'time_slot_id', '')::UUID,
           COALESCE(elem->>'message', ''),
           CASE WHEN elem ? 'details' AND jsonb_typeof(elem->'details') <> 'null'
                THEN elem->'details'
                ELSE NULL
           END
      FROM jsonb_array_elements(p_conflicts) AS elem;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- ============================================================
--  ESCRITURAS — Fase 1: teaching_schedule
-- ============================================================

-- -----------------------------------------------------------
-- fn_solver_persist_teaching_schedule
--  - Cancela el DRAFT vigente del período (si existe).
--  - Crea un nuevo teaching_schedule en DRAFT.
--  - Inserta course_schedule_assignments + course_assignment_slots.
--  Devuelve el id del teaching_schedule creado.
--
--  p_offers shape:
--   [{
--     "course_id":             "uuid",
--     "course_component_id":   "uuid",
--     "teacher_id":            "uuid",
--     "classroom_id":          "uuid",
--     "max_capacity":          120,
--     "time_slot_ids":         ["uuid", ...]
--   }, ...]
--
--  Para que el caller pueda recuperar los assignment_id creados,
--  estos quedan disponibles vía fn_solver_list_offer_vacancies.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_persist_teaching_schedule(
    p_academic_period_id UUID,
    p_created_by         UUID,
    p_offers             JSONB
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id     UUID;
    v_offer           JSONB;
    v_assignment_id   UUID;
    v_classroom_id    UUID;
    v_course_id       UUID;
    v_component_id    UUID;
    v_teacher_id      UUID;
BEGIN
    -- Cancel previous draft for this period.
    UPDATE teaching_schedules
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE academic_period_id = p_academic_period_id
       AND status = 'DRAFT';

    INSERT INTO teaching_schedules (academic_period_id, status, created_by)
    VALUES (p_academic_period_id, 'DRAFT', p_created_by)
    RETURNING id INTO v_schedule_id;

    IF p_offers IS NULL OR jsonb_array_length(p_offers) = 0 THEN
        RETURN v_schedule_id;
    END IF;

    FOR v_offer IN SELECT * FROM jsonb_array_elements(p_offers)
    LOOP
        v_course_id    := (v_offer->>'course_id')::UUID;
        v_component_id := (v_offer->>'course_component_id')::UUID;
        v_teacher_id   := (v_offer->>'teacher_id')::UUID;
        v_classroom_id := (v_offer->>'classroom_id')::UUID;

        INSERT INTO course_schedule_assignments (
            teaching_schedule_id, course_id, course_component_id, teacher_id,
            assignment_status, max_capacity, enrolled_count
        )
        VALUES (
            v_schedule_id, v_course_id, v_component_id, v_teacher_id,
            'DRAFT',
            COALESCE((v_offer->>'max_capacity')::INTEGER, 0),
            0
        )
        RETURNING id INTO v_assignment_id;

        INSERT INTO course_assignment_slots (
            course_assignment_id, teaching_schedule_id, course_id,
            course_component_id, teacher_id, classroom_id, time_slot_id
        )
        SELECT v_assignment_id,
               v_schedule_id,
               v_course_id,
               v_component_id,
               v_teacher_id,
               v_classroom_id,
               (slot_id_text)::UUID
          FROM jsonb_array_elements_text(v_offer->'time_slot_ids') AS slot_id_text;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;


-- ============================================================
--  ESCRITURAS — Fase 2: student_schedule
-- ============================================================

-- -----------------------------------------------------------
-- fn_solver_persist_student_schedule
--  - Cancela cualquier DRAFT vivo del estudiante para el período.
--  - Crea un nuevo student_schedule en DRAFT.
--  - Inserta student_schedule_items.
--  - Incrementa enrolled_count en cada course_schedule_assignment.
--
--  p_items shape:
--   [{
--     "course_id":   "uuid",
--     "components":  [{
--       "course_component_id":  "uuid",
--       "course_assignment_id": "uuid"
--     }]
--   }, ...]
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_solver_persist_student_schedule(
    p_student_id         UUID,
    p_academic_period_id UUID,
    p_generated_by       UUID,
    p_items              JSONB
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id UUID;
    v_item        JSONB;
    v_component   JSONB;
    v_item_id     UUID;
    v_course_id   UUID;
    v_assign_id   UUID;
    v_component_id UUID;
BEGIN
    UPDATE student_schedules
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE student_id = p_student_id
       AND academic_period_id = p_academic_period_id
       AND status = 'DRAFT';

    INSERT INTO student_schedules (student_id, academic_period_id, status, generated_by)
    VALUES (p_student_id, p_academic_period_id, 'DRAFT', p_generated_by)
    RETURNING id INTO v_schedule_id;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN v_schedule_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_course_id := (v_item->>'course_id')::UUID;

        INSERT INTO student_schedule_items (
            student_schedule_id, student_id, course_id,
            course_assignment_id, item_status
        )
        VALUES (
            v_schedule_id,
            p_student_id,
            v_course_id,
            NULLIF(v_item->>'course_assignment_id', '')::UUID,
            'ACTIVE'
        )
        RETURNING id INTO v_item_id;

        IF v_item ? 'components' THEN
            FOR v_component IN SELECT * FROM jsonb_array_elements(v_item->'components')
            LOOP
                v_component_id := (v_component->>'course_component_id')::UUID;
                v_assign_id := (v_component->>'course_assignment_id')::UUID;

                INSERT INTO student_schedule_item_components (
                    student_schedule_item_id, course_component_id,
                    course_assignment_id, item_status
                )
                VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

                UPDATE course_schedule_assignments
                   SET enrolled_count = enrolled_count + 1,
                       updated_at     = NOW()
                 WHERE id = v_assign_id;
            END LOOP;
        ELSE
            v_assign_id := NULLIF(v_item->>'course_assignment_id', '')::UUID;
            IF v_assign_id IS NOT NULL THEN
                SELECT csa.course_component_id INTO v_component_id
                FROM   course_schedule_assignments csa
                WHERE  csa.id = v_assign_id;

                INSERT INTO student_schedule_item_components (
                    student_schedule_item_id, course_component_id,
                    course_assignment_id, item_status
                )
                VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

                UPDATE course_schedule_assignments
                   SET enrolled_count = enrolled_count + 1,
                       updated_at     = NOW()
                 WHERE id = v_assign_id;
            END IF;
        END IF;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;
