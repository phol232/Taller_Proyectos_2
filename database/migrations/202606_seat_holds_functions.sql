-- ============================================================
-- 202606_seat_holds_functions.sql  (Fase 2 — funciones)
-- Generación de horarios en borrador con hold de cupo (estrategia B),
-- confirmación, renovación, liberación y expiración.
-- Depende de 202606_seat_holds.sql.
-- ============================================================

-- -----------------------------------------------------------
-- fn_assignment_available
--  Cupo libre de una asignación = max_capacity - enrolled_count
--  - holds ACTIVE no vencidos de OTROS alumnos (excluye p_exclude_student).
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_assignment_available(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_assignment_available(
    p_assignment_id   UUID,
    p_exclude_student UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT csa.max_capacity - csa.enrolled_count - COALESCE((
               SELECT COUNT(*)
                 FROM seat_holds sh
                WHERE sh.course_assignment_id = p_assignment_id
                  AND sh.status = 'ACTIVE'
                  AND sh.expires_at > NOW()
                  AND (p_exclude_student IS NULL OR sh.student_id <> p_exclude_student)
           ), 0)
      FROM course_schedule_assignments csa
     WHERE csa.id = p_assignment_id;
$$;

-- -----------------------------------------------------------
-- fn_solver_list_offer_vacancies (re-definición)
--  Ahora enrolled_count = enrolled_count real + holds ACTIVE no vencidos,
--  para que el solver vea el cupo NETO de reservas temporales.
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
           csa.enrolled_count + COALESCE((
               SELECT COUNT(*)::INTEGER
                 FROM seat_holds sh
                WHERE sh.course_assignment_id = csa.id
                  AND sh.status = 'ACTIVE'
                  AND sh.expires_at > NOW()
           ), 0),
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
-- fn_student_save_draft_option
--  Crea un horario en borrador (una "opción") con hold de cupo.
--  - Aplica tope p_max_live_drafts (cancela el más viejo si excede).
--  - Por cada componente: bloquea la asignación (FOR UPDATE), valida cupo y
--    crea un seat_hold con TTL p_ttl_seconds. NO toca enrolled_count.
--  - All-or-nothing: si una asignación no tiene cupo, RAISE 'SIN_CUPO:<curso>'
--    y se revierte todo el borrador.
--
--  p_items shape (igual que fn_solver_persist_student_schedule):
--   [{ "course_id":"uuid",
--      "components":[{ "course_component_id":"uuid", "course_assignment_id":"uuid" }] }]
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_save_draft_option(UUID, UUID, UUID, JSONB, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_student_save_draft_option(
    p_student_id         UUID,
    p_academic_period_id UUID,
    p_generated_by       UUID,
    p_items              JSONB,
    p_ttl_seconds        INTEGER DEFAULT 120,
    p_max_live_drafts    INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id  UUID;
    v_item         JSONB;
    v_component    JSONB;
    v_item_id      UUID;
    v_course_id    UUID;
    v_assign_id    UUID;
    v_component_id UUID;
    v_available    INTEGER;
    v_live_count   INTEGER;
    v_oldest_id    UUID;
    v_next_index   SMALLINT;
    v_expires      TIMESTAMPTZ := NOW() + make_interval(secs => p_ttl_seconds);
BEGIN
    -- Tope de borradores vivos: cancela los más viejos hasta dejar hueco.
    LOOP
        SELECT COUNT(*) INTO v_live_count
          FROM student_schedules
         WHERE student_id = p_student_id
           AND academic_period_id = p_academic_period_id
           AND status = 'DRAFT';
        EXIT WHEN v_live_count < p_max_live_drafts;

        SELECT id INTO v_oldest_id
          FROM student_schedules
         WHERE student_id = p_student_id
           AND academic_period_id = p_academic_period_id
           AND status = 'DRAFT'
         ORDER BY created_at ASC
         LIMIT 1;

        UPDATE seat_holds SET status = 'RELEASED'
         WHERE student_schedule_id = v_oldest_id AND status = 'ACTIVE';
        UPDATE student_schedules SET status = 'CANCELLED', updated_at = NOW()
         WHERE id = v_oldest_id;
    END LOOP;

    SELECT COALESCE(MAX(option_index), 0) + 1 INTO v_next_index
      FROM student_schedules
     WHERE student_id = p_student_id
       AND academic_period_id = p_academic_period_id;

    INSERT INTO student_schedules (student_id, academic_period_id, status, generated_by, option_index)
    VALUES (p_student_id, p_academic_period_id, 'DRAFT', p_generated_by, v_next_index)
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
        VALUES (v_schedule_id, p_student_id, v_course_id,
                NULLIF(v_item->>'course_assignment_id', '')::UUID, 'ACTIVE')
        RETURNING id INTO v_item_id;

        FOR v_component IN SELECT * FROM jsonb_array_elements(v_item->'components')
        LOOP
            v_component_id := (v_component->>'course_component_id')::UUID;
            v_assign_id    := (v_component->>'course_assignment_id')::UUID;

            -- Bloqueo de fila para evitar carreras entre alumnos simultáneos.
            PERFORM 1 FROM course_schedule_assignments WHERE id = v_assign_id FOR UPDATE;

            v_available := fn_assignment_available(v_assign_id, p_student_id);
            IF v_available <= 0 THEN
                RAISE EXCEPTION 'SIN_CUPO:%', v_course_id
                      USING ERRCODE = 'P0001';
            END IF;

            INSERT INTO student_schedule_item_components (
                student_schedule_item_id, course_component_id,
                course_assignment_id, item_status
            )
            VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

            INSERT INTO seat_holds (
                course_assignment_id, student_id, student_schedule_id,
                status, expires_at
            )
            VALUES (v_assign_id, p_student_id, v_schedule_id, 'ACTIVE', v_expires);
        END LOOP;
    END LOOP;

    RETURN v_schedule_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_confirm_schedule
--  Confirma una opción: revalida holds, los convierte en matrícula
--  (enrolled_count += 1), marca el horario CONFIRMED y cancela/libera
--  las demás opciones del alumno en el período.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_confirm_schedule(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_confirm_schedule(
    p_student_id  UUID,
    p_schedule_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period_id UUID;
    v_status    VARCHAR(20);
    v_hold      RECORD;
    v_available INTEGER;
BEGIN
    SELECT academic_period_id, status INTO v_period_id, v_status
      FROM student_schedules
     WHERE id = p_schedule_id AND student_id = p_student_id
     FOR UPDATE;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'NO_EXISTE' USING ERRCODE = 'P0002';
    END IF;
    IF v_status <> 'DRAFT' THEN
        RAISE EXCEPTION 'ESTADO_INVALIDO:%', v_status USING ERRCODE = 'P0002';
    END IF;

    -- Revalida y consume cada hold de este borrador.
    FOR v_hold IN
        SELECT id, course_assignment_id, status, expires_at
          FROM seat_holds
         WHERE student_schedule_id = p_schedule_id
    LOOP
        PERFORM 1 FROM course_schedule_assignments
         WHERE id = v_hold.course_assignment_id FOR UPDATE;

        IF v_hold.status <> 'ACTIVE' OR v_hold.expires_at <= NOW() THEN
            -- El hold venció: re-verifica que aún quede cupo libre.
            v_available := fn_assignment_available(v_hold.course_assignment_id, p_student_id);
            IF v_available <= 0 THEN
                RAISE EXCEPTION 'CUPO_EXPIRADO:%', v_hold.course_assignment_id
                      USING ERRCODE = 'P0003';
            END IF;
        END IF;

        UPDATE course_schedule_assignments
           SET enrolled_count = enrolled_count + 1, updated_at = NOW()
         WHERE id = v_hold.course_assignment_id;

        UPDATE seat_holds SET status = 'CONSUMED'
         WHERE id = v_hold.id;
    END LOOP;

    -- Confirma este horario.
    UPDATE student_schedules
       SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
     WHERE id = p_schedule_id;

    -- Cancela las demás opciones del alumno y libera sus holds.
    UPDATE seat_holds sh SET status = 'RELEASED'
      FROM student_schedules ss
     WHERE sh.student_schedule_id = ss.id
       AND ss.student_id = p_student_id
       AND ss.academic_period_id = v_period_id
       AND ss.id <> p_schedule_id
       AND ss.status = 'DRAFT'
       AND sh.status = 'ACTIVE';

    UPDATE student_schedules
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE student_id = p_student_id
       AND academic_period_id = v_period_id
       AND id <> p_schedule_id
       AND status = 'DRAFT';

    RETURN 'CONFIRMED';
END;
$$;

-- -----------------------------------------------------------
-- fn_student_renew_holds — refresca el TTL de los holds vivos de un borrador.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_renew_holds(UUID, INTEGER);

CREATE OR REPLACE FUNCTION fn_student_renew_holds(
    p_schedule_id UUID,
    p_ttl_seconds INTEGER DEFAULT 120
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE seat_holds
       SET expires_at = NOW() + make_interval(secs => p_ttl_seconds)
     WHERE student_schedule_id = p_schedule_id
       AND status = 'ACTIVE'
       AND expires_at > NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_release_option — descarta una opción en borrador.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_release_option(UUID);

CREATE OR REPLACE FUNCTION fn_student_release_option(p_schedule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE seat_holds SET status = 'RELEASED'
     WHERE student_schedule_id = p_schedule_id AND status = 'ACTIVE';
    UPDATE student_schedules SET status = 'CANCELLED', updated_at = NOW()
     WHERE id = p_schedule_id AND status = 'DRAFT';
END;
$$;

-- -----------------------------------------------------------
-- fn_seat_holds_expire — job de limpieza (Fase 6).
--  Libera holds vencidos y cancela borradores que se quedaron sin holds vivos.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_seat_holds_expire();

CREATE OR REPLACE FUNCTION fn_seat_holds_expire()
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE seat_holds SET status = 'RELEASED'
     WHERE status = 'ACTIVE' AND expires_at <= NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE student_schedules ss SET status = 'CANCELLED', updated_at = NOW()
     WHERE ss.status = 'DRAFT'
       AND NOT EXISTS (
           SELECT 1 FROM seat_holds sh
            WHERE sh.student_schedule_id = ss.id
              AND sh.status = 'ACTIVE'
              AND sh.expires_at > NOW()
       )
       AND EXISTS (
           SELECT 1 FROM seat_holds sh WHERE sh.student_schedule_id = ss.id
       );

    RETURN v_count;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_list_schedule_options
--  Cabeceras de las opciones DRAFT vivas de un alumno en el período,
--  con segundos restantes del hold (mínimo entre sus holds).
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_list_schedule_options(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_list_schedule_options(
    p_student_id         UUID,
    p_academic_period_id UUID
)
RETURNS TABLE (
    schedule_id       UUID,
    option_index      SMALLINT,
    status            VARCHAR,
    created_at        TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    seconds_remaining INTEGER,
    item_count        INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT ss.id,
           ss.option_index,
           ss.status,
           ss.created_at,
           MIN(sh.expires_at) AS expires_at,
           GREATEST(0, EXTRACT(EPOCH FROM (MIN(sh.expires_at) - NOW()))::INTEGER) AS seconds_remaining,
           (SELECT COUNT(*)::INTEGER FROM student_schedule_items si
             WHERE si.student_schedule_id = ss.id AND si.item_status = 'ACTIVE') AS item_count
      FROM student_schedules ss
      JOIN seat_holds sh ON sh.student_schedule_id = ss.id AND sh.status = 'ACTIVE'
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_academic_period_id
       AND ss.status = 'DRAFT'
       AND sh.expires_at > NOW()
     GROUP BY ss.id, ss.option_index, ss.status, ss.created_at;
$$;

-- -----------------------------------------------------------
-- fn_student_live_assignment_ids
--  IDs de asignación ya reservadas por el alumno en sus borradores vivos.
--  El solver las usa para que una nueva generación difiera de las previas.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_live_assignment_ids(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_live_assignment_ids(
    p_student_id         UUID,
    p_academic_period_id UUID
)
RETURNS TABLE (course_assignment_id UUID)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT DISTINCT sh.course_assignment_id
      FROM seat_holds sh
      JOIN student_schedules ss ON ss.id = sh.student_schedule_id
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_academic_period_id
       AND ss.status = 'DRAFT'
       AND sh.status = 'ACTIVE'
       AND sh.expires_at > NOW();
$$;

-- -----------------------------------------------------------
-- fn_student_schedule_timetable
--  Slots (formato calendario) de una opción de horario del estudiante.
--  Mismo shape que fn_get_schedule_timetable, filtrado por student_schedule.
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_schedule_timetable(UUID);

CREATE OR REPLACE FUNCTION fn_student_schedule_timetable(p_student_schedule_id UUID)
RETURNS TABLE (
    slot_id        UUID,
    classroom_id   UUID,
    classroom_code VARCHAR,
    classroom_name VARCHAR,
    classroom_type VARCHAR,
    teacher_id     UUID,
    teacher_code   VARCHAR,
    teacher_name   VARCHAR,
    course_id      UUID,
    course_code    VARCHAR,
    course_name    VARCHAR,
    component_type VARCHAR,
    section_id     UUID,
    nrc            CHAR(5),
    section_number SMALLINT,
    day_of_week    day_of_week,
    start_time     TIME,
    end_time       TIME
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cas.id              AS slot_id,
        cl.id               AS classroom_id,
        cl.code             AS classroom_code,
        cl.name             AS classroom_name,
        cl.room_type        AS classroom_type,
        t.id                AS teacher_id,
        t.code              AS teacher_code,
        t.full_name         AS teacher_name,
        c.id                AS course_id,
        c.code              AS course_code,
        c.name              AS course_name,
        cc.component_type   AS component_type,
        cs.id               AS section_id,
        cs.nrc              AS nrc,
        cs.section_number   AS section_number,
        ts.day_of_week      AS day_of_week,
        cas.slot_start_time AS start_time,
        cas.slot_end_time   AS end_time
    FROM student_schedule_items si
    JOIN student_schedule_item_components ssic
                                    ON ssic.student_schedule_item_id = si.id
    JOIN course_assignment_slots cas
                                    ON cas.course_assignment_id = ssic.course_assignment_id
    JOIN time_slots ts              ON ts.id  = cas.time_slot_id
    JOIN classrooms cl              ON cl.id  = cas.classroom_id
    JOIN teachers t                 ON t.id   = cas.teacher_id
    JOIN courses c                  ON c.id   = cas.course_id
    JOIN course_components cc       ON cc.id  = cas.course_component_id
    JOIN course_schedule_assignments csa
                                    ON csa.id = cas.course_assignment_id
    LEFT JOIN course_sections cs    ON cs.id  = csa.section_id
    WHERE si.student_schedule_id = p_student_schedule_id
      AND si.item_status = 'ACTIVE'
      AND ssic.item_status = 'ACTIVE'
    ORDER BY ts.day_of_week ASC, cas.slot_start_time ASC;
END;
$$;
