-- ============================================================
-- 202606_seat_holds.sql  (Fase 1 — esquema)
-- Bloqueo temporal de cupo (hold de 2 min) para horarios del
-- estudiante en borrador + soporte de varias opciones por período.
--
-- Cupo disponible de una asignación =
--   max_capacity - enrolled_count - holds ACTIVE no vencidos de OTROS alumnos.
-- Los holds NO tocan enrolled_count (eso solo ocurre al confirmar).
-- ============================================================

-- 1. Tabla de holds temporales de cupo --------------------------------------
CREATE TABLE IF NOT EXISTS seat_holds (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_assignment_id UUID         NOT NULL,
    student_id           UUID         NOT NULL,
    student_schedule_id  UUID         NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    expires_at           TIMESTAMPTZ  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_seat_holds_assignment
        FOREIGN KEY (course_assignment_id)
        REFERENCES course_schedule_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_schedule
        FOREIGN KEY (student_schedule_id)
        REFERENCES student_schedules(id) ON DELETE CASCADE,
    CONSTRAINT chk_seat_holds_status
        CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED'))
);

-- Cupo disponible por asignación: contar holds activos no vencidos.
CREATE INDEX IF NOT EXISTS idx_seat_holds_assignment_active
    ON seat_holds (course_assignment_id)
    WHERE status = 'ACTIVE';

-- Expiración (job de limpieza Fase 6).
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires
    ON seat_holds (expires_at)
    WHERE status = 'ACTIVE';

-- Liberar/confirmar todos los holds de un borrador.
CREATE INDEX IF NOT EXISTS idx_seat_holds_schedule
    ON seat_holds (student_schedule_id);

-- Evita doble hold del mismo alumno sobre la misma asignación dentro del
-- mismo borrador.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_holds_active_per_assignment
    ON seat_holds (student_schedule_id, course_assignment_id)
    WHERE status = 'ACTIVE';

-- 2. Permitir varios DRAFT por período, único CONFIRMED ----------------------
-- Antes: uq_student_schedules_active_per_period dejaba 1 solo horario activo
-- (DRAFT o CONFIRMED). Ahora pueden coexistir varias opciones DRAFT y solo
-- puede existir un CONFIRMED.
DROP INDEX IF EXISTS uq_student_schedules_active_per_period;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_schedules_confirmed_per_period
    ON student_schedules (student_id, academic_period_id)
    WHERE status = 'CONFIRMED';

-- 3. Orden de las opciones generadas ----------------------------------------
ALTER TABLE student_schedules
    ADD COLUMN IF NOT EXISTS option_index SMALLINT NOT NULL DEFAULT 0;
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
    p_ttl_seconds        INTEGER DEFAULT 300,
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
-- ============================================================
-- 202607_student_schedule_builder.sql
-- Constructor manual del horario del estudiante (RF-13/14).
-- Depende de 202606_seat_holds.sql y 202606_seat_holds_functions.sql.
-- ============================================================

-- Origen del borrador: MANUAL (builder) o SOLVER (generación automática).
ALTER TABLE student_schedules
    ADD COLUMN IF NOT EXISTS draft_source VARCHAR(20) NOT NULL DEFAULT 'SOLVER';

ALTER TABLE student_schedules
    DROP CONSTRAINT IF EXISTS chk_student_schedules_draft_source;

ALTER TABLE student_schedules
    ADD CONSTRAINT chk_student_schedules_draft_source
        CHECK (draft_source IN ('MANUAL', 'SOLVER'));

-- -----------------------------------------------------------
-- fn_get_active_student_schedule — prioriza CONFIRMED sobre DRAFT
-- -----------------------------------------------------------
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
         ORDER BY CASE ss.status WHEN 'CONFIRMED' THEN 0 ELSE 1 END,
                  ss.updated_at DESC
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

-- -----------------------------------------------------------
-- fn_list_student_pending_courses — + prerequisites y cupo por sección
-- -----------------------------------------------------------
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
    prerequisites        JSONB,
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
    course_prereqs AS (
        SELECT cp.course_id,
               COALESCE(
                 JSONB_AGG(
                   JSONB_BUILD_OBJECT(
                     'prerequisite_course_id', cp.prerequisite_course_id,
                     'prerequisite_code',      pc.code,
                     'is_satisfied', EXISTS (
                         SELECT 1 FROM student_completed_courses scc
                          WHERE scc.student_id = p_student_id
                            AND scc.course_id  = cp.prerequisite_course_id
                     )
                   )
                 ),
                 '[]'::JSONB
               ) AS prerequisites_json
          FROM course_prerequisites cp
          JOIN courses pc ON pc.id = cp.prerequisite_course_id
         GROUP BY cp.course_id
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
    section_vacancies AS (
        SELECT sc.course_id,
               sc.section_id,
               sc.nrc,
               sc.section_number,
               sc.components_json,
               (
                 SELECT MIN(fn_assignment_available(
                            (comp->>'assignment_id')::UUID,
                            p_student_id
                        ))
                   FROM JSONB_ARRAY_ELEMENTS(sc.components_json) comp
               ) AS available_vacancies
          FROM section_components sc
    ),
    course_sections_agg AS (
        SELECT sv.course_id,
               COALESCE(
                 JSONB_AGG(
                   JSONB_BUILD_OBJECT(
                     'section_id',           sv.section_id,
                     'nrc',                  sv.nrc,
                     'section_number',       sv.section_number,
                     'available_vacancies',  sv.available_vacancies,
                     'components',           sv.components_json
                   )
                   ORDER BY sv.section_number
                 ),
                 '[]'::JSONB
               ) AS sections_json
          FROM section_vacancies sv
         GROUP BY sv.course_id
    )
    SELECT  cip.id,
            cip.code,
            cip.name,
            cip.cycle,
            cip.credits,
            cip.weekly_hours,
            COALESCE(cc.component_count, 0),
            COALESCE(cp.prerequisites_json, '[]'::JSONB),
            COALESCE(csa.sections_json, '[]'::JSONB)
       FROM courses_in_plan cip
  LEFT JOIN component_counts   cc  ON cc.course_id  = cip.id
  LEFT JOIN course_prereqs     cp  ON cp.course_id  = cip.id
  LEFT JOIN course_sections_agg csa ON csa.course_id = cip.id
   ORDER BY cip.cycle, cip.code;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_ensure_draft
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_ensure_draft(UUID, UUID, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_student_builder_ensure_draft(
    p_student_id         UUID,
    p_academic_period_id UUID,
    p_actor_id           UUID,
    p_ttl_seconds        INTEGER DEFAULT 300,
    p_max_live_drafts    INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id UUID;
    v_live_count  INTEGER;
    v_oldest_id   UUID;
    v_next_index  SMALLINT;
    v_expires     TIMESTAMPTZ := NOW() + make_interval(secs => p_ttl_seconds);
BEGIN
    -- Reutilizar borrador MANUAL vivo del período.
    SELECT ss.id INTO v_schedule_id
      FROM student_schedules ss
      JOIN seat_holds sh ON sh.student_schedule_id = ss.id
                        AND sh.status = 'ACTIVE'
                        AND sh.expires_at > NOW()
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_academic_period_id
       AND ss.status = 'DRAFT'
       AND ss.draft_source = 'MANUAL'
     GROUP BY ss.id
     ORDER BY ss.updated_at DESC
     LIMIT 1;

    IF v_schedule_id IS NOT NULL THEN
        UPDATE seat_holds
           SET expires_at = v_expires
         WHERE student_schedule_id = v_schedule_id
           AND status = 'ACTIVE';
        UPDATE student_schedules
           SET updated_at = NOW(), generated_by = p_actor_id
         WHERE id = v_schedule_id;
        RETURN v_schedule_id;
    END IF;

    -- Borrador MANUAL vacío sin holds activos.
    SELECT ss.id INTO v_schedule_id
      FROM student_schedules ss
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_academic_period_id
       AND ss.status = 'DRAFT'
       AND ss.draft_source = 'MANUAL'
       AND NOT EXISTS (
           SELECT 1 FROM student_schedule_items si
            WHERE si.student_schedule_id = ss.id AND si.item_status = 'ACTIVE'
       )
     ORDER BY ss.created_at DESC
     LIMIT 1;

    IF v_schedule_id IS NOT NULL THEN
        UPDATE student_schedules
           SET updated_at = NOW(), generated_by = p_actor_id
         WHERE id = v_schedule_id;
        RETURN v_schedule_id;
    END IF;

    -- Evicción si se alcanzó el tope de borradores vivos.
    LOOP
        SELECT COUNT(*) INTO v_live_count
          FROM student_schedules ss
         WHERE ss.student_id = p_student_id
           AND ss.academic_period_id = p_academic_period_id
           AND ss.status = 'DRAFT'
           AND EXISTS (
               SELECT 1 FROM seat_holds sh
                WHERE sh.student_schedule_id = ss.id
                  AND sh.status = 'ACTIVE'
                  AND sh.expires_at > NOW()
           );
        EXIT WHEN v_live_count < p_max_live_drafts;

        SELECT ss.id INTO v_oldest_id
          FROM student_schedules ss
         WHERE ss.student_id = p_student_id
           AND ss.academic_period_id = p_academic_period_id
           AND ss.status = 'DRAFT'
         ORDER BY ss.created_at ASC
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

    INSERT INTO student_schedules (
        student_id, academic_period_id, status, generated_by,
        option_index, draft_source
    )
    VALUES (
        p_student_id, p_academic_period_id, 'DRAFT', p_actor_id,
        v_next_index, 'MANUAL'
    )
    RETURNING id INTO v_schedule_id;

    RETURN v_schedule_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_validate
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_validate(UUID, UUID, UUID, UUID[]);

CREATE OR REPLACE FUNCTION fn_student_builder_validate(
    p_student_id    UUID,
    p_schedule_id   UUID,
    p_course_id     UUID,
    p_assignment_ids UUID[]
)
RETURNS TABLE (
    conflict_type VARCHAR,
    message       VARCHAR,
    resource_id   UUID
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_credit_limit    INTEGER;
    v_total_credits   INTEGER := 0;
    v_new_credits     INTEGER;
    v_assign_id       UUID;
    v_available       INTEGER;
    v_missing_prereq  RECORD;
    v_published_id    UUID;
    v_period_id       UUID;
BEGIN
    SELECT s.credit_limit INTO v_credit_limit
      FROM students s WHERE s.id = p_student_id;

    SELECT ss.academic_period_id INTO v_period_id
      FROM student_schedules ss
     WHERE ss.id = p_schedule_id AND ss.student_id = p_student_id;

    IF v_period_id IS NULL THEN
        RETURN QUERY SELECT 'INVALID_SCHEDULE'::VARCHAR,
                            'Horario de borrador no encontrado.'::VARCHAR,
                            p_schedule_id;
        RETURN;
    END IF;

    SELECT ts.id INTO v_published_id
      FROM teaching_schedules ts
     WHERE ts.academic_period_id = v_period_id AND ts.status = 'CONFIRMED'
     LIMIT 1;

    IF v_published_id IS NULL THEN
        RETURN QUERY SELECT 'NO_PUBLISHED_SCHEDULE'::VARCHAR,
                            'No hay horario docente publicado para el período.'::VARCHAR,
                            NULL::UUID;
        RETURN;
    END IF;

    -- Curso duplicado en el borrador.
    IF EXISTS (
        SELECT 1 FROM student_schedule_items ssi
         WHERE ssi.student_schedule_id = p_schedule_id
           AND ssi.course_id = p_course_id
           AND ssi.item_status = 'ACTIVE'
    ) THEN
        RETURN QUERY SELECT 'DUPLICATE_COURSE'::VARCHAR,
                            'El curso ya está en el horario.'::VARCHAR,
                            p_course_id;
        RETURN;
    END IF;

    -- Prerrequisitos faltantes.
    FOR v_missing_prereq IN
        SELECT pc.code AS prereq_code, cp.prerequisite_course_id
          FROM course_prerequisites cp
          JOIN courses pc ON pc.id = cp.prerequisite_course_id
         WHERE cp.course_id = p_course_id
           AND NOT EXISTS (
               SELECT 1 FROM student_completed_courses scc
                WHERE scc.student_id = p_student_id
                  AND scc.course_id  = cp.prerequisite_course_id
           )
    LOOP
        RETURN QUERY SELECT 'PREREQUISITE_MISSING'::VARCHAR,
                            ('Prerrequisito faltante: ' || v_missing_prereq.prereq_code)::VARCHAR,
                            v_missing_prereq.prerequisite_course_id;
    END LOOP;

    -- Créditos.
    SELECT c.credits INTO v_new_credits FROM courses c WHERE c.id = p_course_id;

    SELECT COALESCE(SUM(c.credits), 0) INTO v_total_credits
      FROM student_schedule_items ssi
      JOIN courses c ON c.id = ssi.course_id
     WHERE ssi.student_schedule_id = p_schedule_id
       AND ssi.item_status = 'ACTIVE';

    IF v_total_credits + COALESCE(v_new_credits, 0) > v_credit_limit THEN
        RETURN QUERY SELECT 'CREDITS_EXCEEDED'::VARCHAR,
                            ('Se excedería el límite de créditos (' ||
                             (v_total_credits + COALESCE(v_new_credits, 0)) || '/' || v_credit_limit || ').')::VARCHAR,
                            p_course_id;
    END IF;

    -- Validar assignments y cupo.
    IF p_assignment_ids IS NULL OR array_length(p_assignment_ids, 1) IS NULL THEN
        RETURN QUERY SELECT 'INCOMPLETE_SELECTION'::VARCHAR,
                            'Debe seleccionar todas las asignaciones del curso.'::VARCHAR,
                            p_course_id;
        RETURN;
    END IF;

    FOREACH v_assign_id IN ARRAY p_assignment_ids
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM course_schedule_assignments csa
             WHERE csa.id = v_assign_id
               AND csa.teaching_schedule_id = v_published_id
               AND csa.course_id = p_course_id
               AND csa.assignment_status <> 'CANCELLED'
        ) THEN
            RETURN QUERY SELECT 'INVALID_ASSIGNMENT'::VARCHAR,
                                'Asignación inválida para el curso seleccionado.'::VARCHAR,
                                v_assign_id;
        END IF;

        v_available := fn_assignment_available(v_assign_id, p_student_id);
        IF v_available <= 0 THEN
            RETURN QUERY SELECT 'NO_VACANCY'::VARCHAR,
                                'No hay vacantes disponibles en la sección.'::VARCHAR,
                                v_assign_id;
        END IF;
    END LOOP;

    -- Componentes requeridos.
    IF (
        SELECT COUNT(*) FROM course_components cc
         WHERE cc.course_id = p_course_id AND cc.is_active = TRUE
    ) > COALESCE(array_length(p_assignment_ids, 1), 0) THEN
        RETURN QUERY SELECT 'INCOMPLETE_SELECTION'::VARCHAR,
                            'La selección no incluye todos los componentes del curso.'::VARCHAR,
                            p_course_id;
    END IF;

    -- Solapamiento entre slots del borrador y los nuevos.
    RETURN QUERY
    WITH draft_slots AS (
        SELECT ts.day_of_week,
               cas.slot_start_time AS start_time,
               cas.slot_end_time   AS end_time,
               c.code              AS course_code
          FROM student_schedule_items si
          JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = si.id
          JOIN course_assignment_slots cas ON cas.course_assignment_id = ssic.course_assignment_id
          JOIN time_slots ts ON ts.id = cas.time_slot_id
          JOIN courses c ON c.id = si.course_id
         WHERE si.student_schedule_id = p_schedule_id
           AND si.item_status = 'ACTIVE'
           AND ssic.item_status = 'ACTIVE'
    ),
    new_slots AS (
        SELECT ts.day_of_week,
               cas.slot_start_time AS start_time,
               cas.slot_end_time   AS end_time
          FROM UNNEST(p_assignment_ids) aid
          JOIN course_assignment_slots cas ON cas.course_assignment_id = aid
          JOIN time_slots ts ON ts.id = cas.time_slot_id
    )
    SELECT 'OVERLAP'::VARCHAR,
           ('Solapamiento con ' || ds.course_code || ' el ' || ds.day_of_week::TEXT ||
            ' ' || TO_CHAR(ds.start_time, 'HH24:MI') || '–' || TO_CHAR(ds.end_time, 'HH24:MI'))::VARCHAR,
           p_course_id
      FROM draft_slots ds
      JOIN new_slots ns ON ns.day_of_week = ds.day_of_week
                       AND ns.start_time < ds.end_time
                       AND ns.end_time > ds.start_time;

    -- Solapamiento interno entre componentes de la nueva selección.
    RETURN QUERY
    WITH new_slots AS (
        SELECT ts.day_of_week,
               cas.slot_start_time AS start_time,
               cas.slot_end_time   AS end_time,
               aid                 AS assignment_id
          FROM UNNEST(p_assignment_ids) aid
          JOIN course_assignment_slots cas ON cas.course_assignment_id = aid
          JOIN time_slots ts ON ts.id = cas.time_slot_id
    )
    SELECT 'OVERLAP'::VARCHAR,
           ('Solapamiento entre componentes de la sección el ' || a.day_of_week::TEXT ||
            ' ' || TO_CHAR(a.start_time, 'HH24:MI') || '–' || TO_CHAR(a.end_time, 'HH24:MI'))::VARCHAR,
           p_course_id
      FROM new_slots a
      JOIN new_slots b ON a.assignment_id < b.assignment_id
                      AND a.day_of_week = b.day_of_week
                      AND a.start_time < b.end_time
                      AND a.end_time > b.start_time;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_add_course
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_add_course(UUID, UUID, UUID, UUID[], UUID, INTEGER);

CREATE OR REPLACE FUNCTION fn_student_builder_add_course(
    p_student_id      UUID,
    p_schedule_id     UUID,
    p_course_id       UUID,
    p_assignment_ids  UUID[],
    p_actor_id        UUID,
    p_ttl_seconds     INTEGER DEFAULT 300
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_conflict      RECORD;
    v_item_id       UUID;
    v_assign_id     UUID;
    v_component_id  UUID;
    v_available     INTEGER;
    v_expires       TIMESTAMPTZ := NOW() + make_interval(secs => p_ttl_seconds);
BEGIN
    FOR v_conflict IN
        SELECT * FROM fn_student_builder_validate(
            p_student_id, p_schedule_id, p_course_id, p_assignment_ids
        )
    LOOP
        RAISE EXCEPTION '%:%', v_conflict.conflict_type, v_conflict.message
              USING ERRCODE = 'P0001';
    END LOOP;

    INSERT INTO student_schedule_items (
        student_schedule_id, student_id, course_id, item_status
    )
    VALUES (p_schedule_id, p_student_id, p_course_id, 'ACTIVE')
    RETURNING id INTO v_item_id;

    FOREACH v_assign_id IN ARRAY p_assignment_ids
    LOOP
        PERFORM 1 FROM course_schedule_assignments WHERE id = v_assign_id FOR UPDATE;

        v_available := fn_assignment_available(v_assign_id, p_student_id);
        IF v_available <= 0 THEN
            RAISE EXCEPTION 'SIN_CUPO:%', p_course_id USING ERRCODE = 'P0001';
        END IF;

        SELECT csa.course_component_id INTO v_component_id
          FROM course_schedule_assignments csa WHERE csa.id = v_assign_id;

        INSERT INTO student_schedule_item_components (
            student_schedule_item_id, course_component_id,
            course_assignment_id, item_status
        )
        VALUES (v_item_id, v_component_id, v_assign_id, 'ACTIVE');

        UPDATE seat_holds
           SET expires_at = v_expires, status = 'ACTIVE'
         WHERE id = (
             SELECT sh.id
               FROM seat_holds sh
              WHERE sh.student_schedule_id = p_schedule_id
                AND sh.course_assignment_id = v_assign_id
                AND sh.student_id = p_student_id
              ORDER BY
                  CASE sh.status
                      WHEN 'ACTIVE' THEN 0
                      WHEN 'RELEASED' THEN 1
                      ELSE 2
                  END,
                  sh.created_at DESC
              LIMIT 1
         );

        IF NOT FOUND THEN
            INSERT INTO seat_holds (
                course_assignment_id, student_id, student_schedule_id,
                status, expires_at
            )
            VALUES (v_assign_id, p_student_id, p_schedule_id, 'ACTIVE', v_expires);
        END IF;

        DELETE FROM seat_holds
         WHERE student_schedule_id = p_schedule_id
           AND course_assignment_id = v_assign_id
           AND student_id = p_student_id
           AND status = 'RELEASED';
    END LOOP;

    UPDATE student_schedule_items
       SET course_assignment_id = p_assignment_ids[1]
     WHERE id = v_item_id;

    UPDATE student_schedules
       SET updated_at = NOW(), generated_by = p_actor_id, draft_source = 'MANUAL'
     WHERE id = p_schedule_id;

    RETURN v_item_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_remove_course
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_remove_course(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_builder_remove_course(
    p_schedule_id UUID,
    p_course_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    SELECT ssi.id INTO v_item_id
      FROM student_schedule_items ssi
     WHERE ssi.student_schedule_id = p_schedule_id
       AND ssi.course_id = p_course_id
       AND ssi.item_status = 'ACTIVE';

    IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'Curso no encontrado en el borrador.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE seat_holds SET status = 'RELEASED'
     WHERE student_schedule_id = p_schedule_id
       AND course_assignment_id IN (
           SELECT ssic.course_assignment_id
             FROM student_schedule_item_components ssic
            WHERE ssic.student_schedule_item_id = v_item_id
       )
       AND status = 'ACTIVE';

    DELETE FROM student_schedule_item_components
     WHERE student_schedule_item_id = v_item_id;

    DELETE FROM student_schedule_items WHERE id = v_item_id;

    UPDATE student_schedules SET updated_at = NOW() WHERE id = p_schedule_id;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_get_draft
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_get_draft(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_builder_get_draft(
    p_student_id  UUID,
    p_period_id   UUID
)
RETURNS TABLE (
    schedule_id       UUID,
    option_index      SMALLINT,
    status            VARCHAR,
    draft_source      VARCHAR,
    credit_limit      INTEGER,
    total_credits     INTEGER,
    expires_at        TIMESTAMPTZ,
    seconds_remaining INTEGER,
    live_draft_count  INTEGER,
    items             JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id UUID;
BEGIN
    SELECT ss.id INTO v_schedule_id
      FROM student_schedules ss
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_period_id
       AND ss.status = 'DRAFT'
       AND ss.draft_source = 'MANUAL'
     ORDER BY ss.updated_at DESC
     LIMIT 1;

    IF v_schedule_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH item_data AS (
        SELECT ssi.id              AS item_id,
               ssi.course_id,
               c.code              AS course_code,
               c.name              AS course_name,
               c.credits           AS course_credits,
               (
                   SELECT cs2.nrc
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS nrc,
               (
                   SELECT cs2.section_number
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_number,
               (
                   SELECT csa2.section_id
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'course_component_id',  ssic.course_component_id,
                   'course_assignment_id', ssic.course_assignment_id,
                   'component_type',       cc.component_type
                 )
                 ORDER BY cc.sort_order
               ) AS components_json
          FROM student_schedule_items ssi
          JOIN courses c ON c.id = ssi.course_id
          JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
          JOIN course_components cc ON cc.id = ssic.course_component_id
         WHERE ssi.student_schedule_id = v_schedule_id
           AND ssi.item_status = 'ACTIVE'
         GROUP BY ssi.id, ssi.course_id, c.code, c.name, c.credits
    )
    SELECT v_schedule_id,
           ss.option_index,
           ss.status::VARCHAR,
           ss.draft_source,
           st.credit_limit,
           COALESCE((SELECT SUM(c.credits)::INTEGER
                       FROM student_schedule_items si
                       JOIN courses c ON c.id = si.course_id
                      WHERE si.student_schedule_id = v_schedule_id
                        AND si.item_status = 'ACTIVE'), 0),
           MIN(sh.expires_at),
           GREATEST(0, EXTRACT(EPOCH FROM (MIN(sh.expires_at) - NOW()))::INTEGER),
           (SELECT COUNT(*)::INTEGER
              FROM student_schedules s2
             WHERE s2.student_id = p_student_id
               AND s2.academic_period_id = p_period_id
               AND s2.status = 'DRAFT'
               AND EXISTS (
                   SELECT 1 FROM seat_holds h
                    WHERE h.student_schedule_id = s2.id
                      AND h.status = 'ACTIVE'
                      AND h.expires_at > NOW()
               )),
           COALESCE(
             (SELECT JSONB_AGG(
                       JSONB_BUILD_OBJECT(
                         'item_id',         id.item_id,
                         'course_id',       id.course_id,
                         'course_code',     id.course_code,
                         'course_name',     id.course_name,
                         'course_credits',  id.course_credits,
                         'section_id',      id.section_id,
                         'nrc',             id.nrc,
                         'section_number',  id.section_number,
                         'components',      id.components_json
                       )
                       ORDER BY id.course_code
                     ) FROM item_data id),
             '[]'::JSONB
           )
      FROM student_schedules ss
      JOIN students st ON st.id = ss.student_id
 LEFT JOIN seat_holds sh ON sh.student_schedule_id = ss.id
                        AND sh.status = 'ACTIVE'
                        AND sh.expires_at > NOW()
     WHERE ss.id = v_schedule_id
     GROUP BY ss.option_index, ss.status, ss.draft_source, st.credit_limit;
END;
$$;

-- -----------------------------------------------------------
-- fn_student_builder_import_from — abre la opción en el builder (mismo borrador)
-- -----------------------------------------------------------
DROP FUNCTION IF EXISTS fn_student_builder_import_from(UUID, UUID, UUID, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fn_student_builder_import_from(
    p_student_id         UUID,
    p_academic_period_id UUID,
    p_source_schedule_id UUID,
    p_actor_id           UUID,
    p_ttl_seconds        INTEGER DEFAULT 300,
    p_max_live_drafts    INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM student_schedules
         WHERE id = p_source_schedule_id
           AND student_id = p_student_id
           AND academic_period_id = p_academic_period_id
           AND status = 'DRAFT'
    ) THEN
        RAISE EXCEPTION 'Opción de origen no encontrada o no es borrador.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE student_schedules
       SET draft_source = 'MANUAL',
           updated_at   = NOW(),
           generated_by = p_actor_id
     WHERE id = p_source_schedule_id;

    PERFORM fn_student_renew_holds(p_source_schedule_id, p_ttl_seconds);

    RETURN p_source_schedule_id;
END;
$$;

-- fn_student_builder_get_draft_by_schedule
DROP FUNCTION IF EXISTS fn_student_builder_get_draft_by_schedule(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_builder_get_draft_by_schedule(
    p_student_id  UUID,
    p_schedule_id UUID
)
RETURNS TABLE (
    schedule_id       UUID,
    option_index      SMALLINT,
    status            VARCHAR,
    draft_source      VARCHAR,
    credit_limit      INTEGER,
    total_credits     INTEGER,
    expires_at        TIMESTAMPTZ,
    seconds_remaining INTEGER,
    live_draft_count  INTEGER,
    items             JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_period_id UUID;
BEGIN
    SELECT ss.academic_period_id
      INTO v_period_id
      FROM student_schedules ss
     WHERE ss.id = p_schedule_id
       AND ss.student_id = p_student_id
       AND ss.status = 'DRAFT';

    IF v_period_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH item_data AS (
        SELECT ssi.id              AS item_id,
               ssi.course_id,
               c.code              AS course_code,
               c.name              AS course_name,
               c.credits           AS course_credits,
               (
                   SELECT cs2.nrc
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS nrc,
               (
                   SELECT cs2.section_number
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_number,
               (
                   SELECT csa2.section_id
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'course_component_id',  ssic.course_component_id,
                   'course_assignment_id', ssic.course_assignment_id,
                   'component_type',       cc.component_type
                 )
                 ORDER BY cc.sort_order
               ) AS components_json
          FROM student_schedule_items ssi
          JOIN courses c ON c.id = ssi.course_id
          JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
          JOIN course_components cc ON cc.id = ssic.course_component_id
         WHERE ssi.student_schedule_id = p_schedule_id
           AND ssi.item_status = 'ACTIVE'
         GROUP BY ssi.id, ssi.course_id, c.code, c.name, c.credits
    )
    SELECT p_schedule_id,
           ss.option_index,
           ss.status::VARCHAR,
           ss.draft_source,
           st.credit_limit,
           COALESCE((SELECT SUM(c.credits)::INTEGER
                       FROM student_schedule_items si
                       JOIN courses c ON c.id = si.course_id
                      WHERE si.student_schedule_id = p_schedule_id
                        AND si.item_status = 'ACTIVE'), 0),
           MIN(sh.expires_at),
           GREATEST(0, EXTRACT(EPOCH FROM (MIN(sh.expires_at) - NOW()))::INTEGER),
           (SELECT COUNT(*)::INTEGER
              FROM student_schedules s2
             WHERE s2.student_id = p_student_id
               AND s2.academic_period_id = v_period_id
               AND s2.status = 'DRAFT'
               AND EXISTS (
                   SELECT 1 FROM seat_holds h
                    WHERE h.student_schedule_id = s2.id
                      AND h.status = 'ACTIVE'
                      AND h.expires_at > NOW()
               )),
           COALESCE(
             (SELECT JSONB_AGG(
                       JSONB_BUILD_OBJECT(
                         'item_id',         id.item_id,
                         'course_id',       id.course_id,
                         'course_code',     id.course_code,
                         'course_name',     id.course_name,
                         'course_credits',  id.course_credits,
                         'section_id',      id.section_id,
                         'nrc',             id.nrc,
                         'section_number',  id.section_number,
                         'components',      id.components_json
                       )
                       ORDER BY id.course_code
                     ) FROM item_data id),
             '[]'::JSONB
           )
      FROM student_schedules ss
      JOIN students st ON st.id = ss.student_id
 LEFT JOIN seat_holds sh ON sh.student_schedule_id = ss.id
                        AND sh.status = 'ACTIVE'
                        AND sh.expires_at > NOW()
     WHERE ss.id = p_schedule_id
     GROUP BY ss.option_index, ss.status, ss.draft_source, st.credit_limit;
END;
$$;

-- -----------------------------------------------------------
-- fn_save_student_schedule — delega en builder granular
-- -----------------------------------------------------------
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
    v_schedule_id UUID;
    v_item        JSONB;
    v_course_id   UUID;
    v_assign_ids  UUID[];
BEGIN
    v_schedule_id := fn_student_builder_ensure_draft(p_student_id, p_period_id, p_actor_id);

    UPDATE seat_holds SET status = 'RELEASED'
     WHERE student_schedule_id = v_schedule_id AND status = 'ACTIVE';
    DELETE FROM student_schedule_item_components ssic
     USING student_schedule_items ssi
     WHERE ssic.student_schedule_item_id = ssi.id
       AND ssi.student_schedule_id = v_schedule_id;
    DELETE FROM student_schedule_items WHERE student_schedule_id = v_schedule_id;

    FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(COALESCE(p_items, '[]'::JSONB))
    LOOP
        v_course_id := (v_item->>'course_id')::UUID;
        SELECT ARRAY_AGG(aid::UUID)
          INTO v_assign_ids
          FROM JSONB_ARRAY_ELEMENTS_TEXT(v_item->'assignment_ids') aid;

        PERFORM fn_student_builder_add_course(
            p_student_id, v_schedule_id, v_course_id, v_assign_ids, p_actor_id
        );
    END LOOP;

    RETURN v_schedule_id;
END;
$$;
