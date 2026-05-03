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
DROP FUNCTION IF EXISTS fn_solver_get_period(UUID);

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

-- -----------------------------------------------------------
-- fn_solver_list_active_teachers
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_list_active_teachers();

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
DROP FUNCTION IF EXISTS fn_solver_list_active_time_slots();

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
DROP FUNCTION IF EXISTS fn_solver_list_teacher_courses();

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
DROP FUNCTION IF EXISTS fn_solver_list_classroom_courses();

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
DROP FUNCTION IF EXISTS fn_solver_list_teacher_availability();

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
DROP FUNCTION IF EXISTS fn_solver_list_classroom_availability();

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
DROP FUNCTION IF EXISTS fn_solver_list_course_prerequisites();

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
DROP FUNCTION IF EXISTS fn_solver_list_course_corequisites();

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
DROP FUNCTION IF EXISTS fn_solver_list_building_travel_times();

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
DROP FUNCTION IF EXISTS fn_solver_get_confirmed_teaching_schedule(UUID);

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
DROP FUNCTION IF EXISTS fn_solver_list_completed_courses(UUID[]);

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
    assignment_id       UUID,
    course_id           UUID,
    course_component_id UUID,
    teacher_id          UUID,
    classroom_id        UUID,
    max_capacity        INTEGER,
    enrolled_count      INTEGER,
    time_slot_ids       UUID[],
    slot_start_times    TIME[],
    slot_end_times      TIME[],
    section_id          UUID,
    nrc                 CHAR(5),
    section_number      SMALLINT
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
             (SELECT array_agg(cas.time_slot_id ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::UUID[]
           ),
           COALESCE(
             (SELECT array_agg(cas.slot_start_time ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::TIME[]
           ),
           COALESCE(
             (SELECT array_agg(cas.slot_end_time ORDER BY cas.slot_start_time, cas.slot_end_time, cas.time_slot_id)
                FROM course_assignment_slots cas
               WHERE cas.course_assignment_id = csa.id),
             ARRAY[]::TIME[]
           ),
           cs.id,
           cs.nrc,
           cs.section_number
      FROM course_schedule_assignments csa
      LEFT JOIN course_sections cs ON cs.id = csa.section_id
     WHERE csa.teaching_schedule_id = p_teaching_schedule_id
       AND csa.assignment_status IN ('DRAFT', 'CONFIRMED');
END;
$$;

-- -----------------------------------------------------------
-- fn_generate_unique_nrc
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_generate_unique_nrc();

CREATE OR REPLACE FUNCTION fn_generate_unique_nrc()
RETURNS CHAR(5)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_candidate CHAR(5);
    v_attempts  INTEGER := 0;
BEGIN
    LOOP
        v_candidate := LPAD((FLOOR(RANDOM() * 100000))::BIGINT::TEXT, 5, '0');

        IF NOT EXISTS (
            SELECT 1 FROM course_sections WHERE nrc = v_candidate
        ) THEN
            RETURN v_candidate;
        END IF;

        v_attempts := v_attempts + 1;
        IF v_attempts >= 100 THEN
            RAISE EXCEPTION 'fn_generate_unique_nrc: no se pudo generar un NRC único tras 100 intentos.'
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------
-- fn_list_course_sections
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_list_course_sections(UUID);

CREATE OR REPLACE FUNCTION fn_list_course_sections(p_teaching_schedule_id UUID)
RETURNS TABLE (
    id                   UUID,
    teaching_schedule_id UUID,
    course_id            UUID,
    course_code          VARCHAR,
    course_name          VARCHAR,
    nrc                  CHAR(5),
    section_number       SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cs.id,
           cs.teaching_schedule_id,
           cs.course_id,
           c.code,
           c.name,
           cs.nrc,
           cs.section_number
      FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
     WHERE cs.teaching_schedule_id = p_teaching_schedule_id
       AND cs.is_active = TRUE
     ORDER BY c.code ASC, cs.section_number ASC;
END;
$$;


-- ============================================================
--  ESCRITURAS — solver_runs / solver_run_conflicts
-- ============================================================

-- -----------------------------------------------------------
-- fn_solver_get_run
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_get_run(UUID);

CREATE OR REPLACE FUNCTION fn_solver_get_run(p_run_id UUID)
RETURNS TABLE (
    id                 UUID,
    run_type           VARCHAR,
    academic_period_id UUID,
    student_id         UUID,
    teaching_schedule_id UUID,
    status             VARCHAR,
    requested_by       UUID,
    seed               INTEGER,
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
           sr.teaching_schedule_id, sr.status, sr.requested_by, sr.seed,
           sr.time_limit_ms, sr.input_hash,
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
DROP FUNCTION IF EXISTS fn_solver_create_run(VARCHAR, UUID, UUID, UUID, INTEGER, VARCHAR, INTEGER);

CREATE OR REPLACE FUNCTION fn_solver_create_run(
    p_run_type           VARCHAR,
    p_academic_period_id UUID,
    p_student_id         UUID,
    p_requested_by       UUID,
    p_time_limit_ms      INTEGER,
    p_input_hash         VARCHAR,
    p_seed               INTEGER DEFAULT NULL
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
                             status, requested_by, seed, time_limit_ms, input_hash,
                             started_at)
    VALUES (UPPER(TRIM(p_run_type)),
            p_academic_period_id,
            p_student_id,
            'RUNNING',
            p_requested_by,
            p_seed,
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
DROP FUNCTION IF EXISTS fn_solver_finish_run(UUID, VARCHAR, TEXT, UUID);

CREATE OR REPLACE FUNCTION fn_solver_finish_run(
    p_run_id               UUID,
    p_status               VARCHAR,
    p_summary              TEXT,
    p_teaching_schedule_id UUID DEFAULT NULL
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
           teaching_schedule_id = COALESCE(p_teaching_schedule_id, teaching_schedule_id),
           finished_at    = NOW(),
           updated_at     = NOW()
     WHERE id = p_run_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_set_run_input_hash
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_set_run_input_hash(UUID, VARCHAR);

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
DROP FUNCTION IF EXISTS fn_solver_add_conflicts(UUID, JSONB);

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

-- -----------------------------------------------------------
-- fn_solver_reserve_generation_request
--  Rolling window: máximo 5 generaciones aceptadas por actor
--  cada 5 minutos. Devuelve reserva o datos para HTTP 429.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_reserve_generation_request(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_solver_reserve_generation_request(
    p_actor_id           UUID,
    p_academic_period_id UUID
)
RETURNS TABLE (
    reservation_id      UUID,
    accepted            BOOLEAN,
    retry_after_seconds INTEGER,
    remaining           INTEGER
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_limit        INTEGER := 5;
    v_window       INTERVAL := INTERVAL '5 minutes';
    v_recent_count INTEGER;
    v_oldest       TIMESTAMPTZ;
    v_id           UUID;
BEGIN
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'actor_id es obligatorio' USING ERRCODE = 'P0001';
    END IF;

    UPDATE solver_generation_reservations
       SET status = 'EXPIRED', updated_at = NOW()
     WHERE actor_id = p_actor_id
       AND status = 'ACCEPTED'
       AND expires_at < NOW();

    SELECT COUNT(*)::INTEGER, MIN(created_at)
      INTO v_recent_count, v_oldest
      FROM solver_generation_reservations
     WHERE actor_id = p_actor_id
       AND status IN ('ACCEPTED', 'CONSUMED')
       AND created_at > NOW() - v_window;

    IF v_recent_count >= v_limit THEN
        RETURN QUERY
        SELECT NULL::UUID,
               FALSE,
               GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_oldest + v_window - NOW())))::INTEGER),
               0;
        RETURN;
    END IF;

    INSERT INTO solver_generation_reservations (
        actor_id, academic_period_id, status, expires_at
    )
    VALUES (
        p_actor_id, p_academic_period_id, 'ACCEPTED', NOW() + v_window
    )
    RETURNING id INTO v_id;

    RETURN QUERY
    SELECT v_id,
           TRUE,
           0,
           GREATEST(0, v_limit - v_recent_count - 1);
END;
$$;

-- -----------------------------------------------------------
-- fn_solver_consume_generation_reservation
--  El solver llama esta función antes de ejecutar para validar
--  que el backend haya reservado la generación.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_solver_consume_generation_reservation(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION fn_solver_consume_generation_reservation(
    p_reservation_id     UUID,
    p_actor_id           UUID,
    p_academic_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE solver_generation_reservations
       SET status = 'CONSUMED',
           consumed_at = NOW(),
           updated_at = NOW()
     WHERE id = p_reservation_id
       AND actor_id = p_actor_id
       AND academic_period_id = p_academic_period_id
       AND status = 'ACCEPTED'
       AND expires_at >= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count = 1;
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
DROP FUNCTION IF EXISTS fn_solver_persist_teaching_schedule(UUID, UUID, JSONB, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_solver_persist_teaching_schedule(
    p_academic_period_id UUID,
    p_created_by         UUID,
    p_offers             JSONB,
    p_keep_existing_drafts BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id      UUID;
    v_offer            JSONB;
    v_assignment_id    UUID;
    v_classroom_id     UUID;
    v_course_id        UUID;
    v_component_id     UUID;
    v_teacher_id       UUID;
    v_section_number   SMALLINT;
    v_section_id       UUID;
    v_block            JSONB;
    v_slot_id          UUID;
    v_slot_start       TIME;
    v_slot_end         TIME;
BEGIN
    IF NOT COALESCE(p_keep_existing_drafts, FALSE) THEN
        UPDATE teaching_schedules
           SET status = 'CANCELLED', updated_at = NOW()
         WHERE academic_period_id = p_academic_period_id
           AND status = 'DRAFT';
    END IF;

    INSERT INTO teaching_schedules (academic_period_id, status, created_by)
    VALUES (p_academic_period_id, 'DRAFT', p_created_by)
    RETURNING id INTO v_schedule_id;

    IF p_offers IS NULL OR jsonb_array_length(p_offers) = 0 THEN
        RETURN v_schedule_id;
    END IF;

    FOR v_offer IN SELECT * FROM jsonb_array_elements(p_offers)
    LOOP
        v_course_id      := (v_offer->>'course_id')::UUID;
        v_component_id   := (v_offer->>'course_component_id')::UUID;
        v_teacher_id     := (v_offer->>'teacher_id')::UUID;
        v_classroom_id   := (v_offer->>'classroom_id')::UUID;
        v_section_number := COALESCE((v_offer->>'section_number')::SMALLINT, 1);

        INSERT INTO course_sections (
            teaching_schedule_id, course_id, nrc, section_number
        )
        VALUES (
            v_schedule_id,
            v_course_id,
            fn_generate_unique_nrc(),
            v_section_number
        )
        ON CONFLICT (teaching_schedule_id, course_id, section_number) DO NOTHING;

        SELECT id INTO v_section_id
          FROM course_sections
         WHERE teaching_schedule_id = v_schedule_id
           AND course_id            = v_course_id
           AND section_number       = v_section_number;

        INSERT INTO course_schedule_assignments (
            teaching_schedule_id, course_id, course_component_id, teacher_id,
            assignment_status, max_capacity, enrolled_count, section_id
        )
        VALUES (
            v_schedule_id, v_course_id, v_component_id, v_teacher_id,
            'DRAFT',
            COALESCE((v_offer->>'max_capacity')::INTEGER, 0),
            0,
            v_section_id
        )
        RETURNING id INTO v_assignment_id;

        IF v_offer ? 'blocks' THEN
            FOR v_block IN SELECT * FROM jsonb_array_elements(v_offer->'blocks')
            LOOP
                v_slot_id    := (v_block->>'time_slot_id')::UUID;
                v_slot_start := (v_block->>'start_time')::TIME;
                v_slot_end   := (v_block->>'end_time')::TIME;

                INSERT INTO course_assignment_slots (
                    course_assignment_id, teaching_schedule_id, course_id,
                    course_component_id, teacher_id, classroom_id, time_slot_id,
                    slot_start_time, slot_end_time
                )
                VALUES (
                    v_assignment_id,
                    v_schedule_id,
                    v_course_id,
                    v_component_id,
                    v_teacher_id,
                    v_classroom_id,
                    v_slot_id,
                    v_slot_start,
                    v_slot_end
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        ELSE
            INSERT INTO course_assignment_slots (
                course_assignment_id, teaching_schedule_id, course_id,
                course_component_id, teacher_id, classroom_id, time_slot_id,
                slot_start_time, slot_end_time
            )
            SELECT v_assignment_id,
                   v_schedule_id,
                   v_course_id,
                   v_component_id,
                   v_teacher_id,
                   v_classroom_id,
                   (slot_id_text)::UUID,
                   ts.start_time,
                   ts.end_time
              FROM jsonb_array_elements_text(v_offer->'time_slot_ids') AS slot_id_text
              JOIN time_slots ts ON ts.id = (slot_id_text)::UUID
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_list_teaching_schedule_options
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_list_teaching_schedule_options(UUID);

CREATE OR REPLACE FUNCTION fn_list_teaching_schedule_options(p_academic_period_id UUID)
RETURNS TABLE (
    id                 UUID,
    academic_period_id UUID,
    status             VARCHAR,
    created_by         UUID,
    created_at         TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ,
    confirmed_at       TIMESTAMPTZ,
    solver_run_id      UUID,
    seed               INTEGER,
    offer_count        INTEGER,
    slot_count         INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT ts.id,
           ts.academic_period_id,
           ts.status,
           ts.created_by,
           ts.created_at,
           ts.updated_at,
           ts.confirmed_at,
           sr.id,
           sr.seed,
           COALESCE(COUNT(DISTINCT csa.id), 0)::INTEGER,
           COALESCE(COUNT(cas.id), 0)::INTEGER
      FROM teaching_schedules ts
 LEFT JOIN solver_runs sr ON sr.teaching_schedule_id = ts.id
 LEFT JOIN course_schedule_assignments csa ON csa.teaching_schedule_id = ts.id
 LEFT JOIN course_assignment_slots cas ON cas.course_assignment_id = csa.id
     WHERE ts.academic_period_id = p_academic_period_id
       AND ts.status IN ('DRAFT', 'CONFIRMED')
  GROUP BY ts.id, sr.id, sr.seed
  ORDER BY ts.created_at DESC;
END;
$$;

-- -----------------------------------------------------------
-- fn_confirm_teaching_schedule
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_confirm_teaching_schedule(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_confirm_teaching_schedule(
    p_schedule_id   UUID,
    p_confirmed_by  UUID
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period_id UUID;
BEGIN
    SELECT academic_period_id INTO v_period_id
      FROM teaching_schedules
     WHERE id = p_schedule_id
       AND status IN ('DRAFT', 'CONFIRMED');

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'Horario no encontrado o no confirmable: %', p_schedule_id
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE teaching_schedules
       SET status = 'CANCELLED',
           updated_at = NOW()
     WHERE academic_period_id = v_period_id
       AND id <> p_schedule_id
       AND status IN ('DRAFT', 'CONFIRMED');

    UPDATE course_schedule_assignments csa
       SET assignment_status = 'CANCELLED',
           updated_at = NOW()
      FROM teaching_schedules ts
     WHERE ts.id = csa.teaching_schedule_id
       AND ts.academic_period_id = v_period_id
       AND ts.id <> p_schedule_id
       AND csa.assignment_status IN ('DRAFT', 'CONFIRMED');

    UPDATE teaching_schedules
       SET status = 'CONFIRMED',
           confirmed_by = p_confirmed_by,
           confirmed_at = NOW(),
           updated_at = NOW()
     WHERE id = p_schedule_id;

    UPDATE course_schedule_assignments
       SET assignment_status = 'CONFIRMED',
           updated_at = NOW()
     WHERE teaching_schedule_id = p_schedule_id
       AND assignment_status <> 'CANCELLED';

    RETURN p_schedule_id;
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
DROP FUNCTION IF EXISTS fn_solver_persist_student_schedule(UUID, UUID, UUID, JSONB);

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
