-- Migración: opciones de horario por request y rate limit de generación
-- Fecha: 2026-05-03

-- 1. Metadatos y trazabilidad.
ALTER TABLE teaching_schedules
    ADD COLUMN IF NOT EXISTS option_label VARCHAR(50);

ALTER TABLE solver_runs
    ADD COLUMN IF NOT EXISTS teaching_schedule_id UUID NULL,
    ADD COLUMN IF NOT EXISTS seed INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
         WHERE table_name = 'solver_runs'
           AND constraint_name = 'fk_solver_runs_teaching_schedule'
    ) THEN
        ALTER TABLE solver_runs
            ADD CONSTRAINT fk_solver_runs_teaching_schedule
            FOREIGN KEY (teaching_schedule_id)
            REFERENCES teaching_schedules(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_solver_runs_teaching_schedule_id
    ON solver_runs(teaching_schedule_id)
    WHERE teaching_schedule_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS solver_generation_reservations (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id           UUID         NOT NULL,
    academic_period_id UUID         NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACCEPTED',
    expires_at         TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    consumed_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_solver_generation_reservations_actor
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_solver_generation_reservations_period
        FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    CONSTRAINT chk_solver_generation_reservations_status
        CHECK (status IN ('ACCEPTED', 'CONSUMED', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_solver_generation_reservations_actor_window
    ON solver_generation_reservations(actor_id, created_at DESC)
    WHERE status IN ('ACCEPTED', 'CONSUMED');

CREATE INDEX IF NOT EXISTS idx_solver_generation_reservations_period
    ON solver_generation_reservations(academic_period_id);

-- 2. Funciones de rate limit/reserva.
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
    SELECT v_id, TRUE, 0, GREATEST(0, v_limit - v_recent_count - 1);
END;
$$;

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

-- 3. Run metadata.
DROP FUNCTION IF EXISTS fn_solver_get_run(UUID);
CREATE OR REPLACE FUNCTION fn_solver_get_run(p_run_id UUID)
RETURNS TABLE (
    id                   UUID,
    run_type             VARCHAR,
    academic_period_id   UUID,
    student_id           UUID,
    teaching_schedule_id UUID,
    status               VARCHAR,
    requested_by         UUID,
    seed                 INTEGER,
    time_limit_ms        INTEGER,
    input_hash           VARCHAR,
    result_summary       TEXT,
    started_at           TIMESTAMPTZ,
    finished_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT sr.id, sr.run_type, sr.academic_period_id, sr.student_id,
           sr.teaching_schedule_id, sr.status, sr.requested_by, sr.seed,
           sr.time_limit_ms, sr.input_hash, sr.result_summary,
           sr.started_at, sr.finished_at, sr.created_at
      FROM solver_runs sr
     WHERE sr.id = p_run_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_solver_create_run(VARCHAR, UUID, UUID, UUID, INTEGER, VARCHAR);
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
                             status, requested_by, seed, time_limit_ms,
                             input_hash, started_at)
    VALUES (UPPER(TRIM(p_run_type)), p_academic_period_id, p_student_id,
            'RUNNING', p_requested_by, p_seed,
            COALESCE(p_time_limit_ms, 30000), p_input_hash, NOW())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS fn_solver_finish_run(UUID, VARCHAR, TEXT);
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
       SET status = UPPER(TRIM(p_status)),
           result_summary = p_summary,
           teaching_schedule_id = COALESCE(p_teaching_schedule_id, teaching_schedule_id),
           finished_at = NOW(),
           updated_at = NOW()
     WHERE id = p_run_id;
END;
$$;

-- 4. Persistencia de opciones. keep_existing_drafts=true mantiene opciones vivas.
DROP FUNCTION IF EXISTS fn_solver_persist_teaching_schedule(UUID, UUID, JSONB);
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

        INSERT INTO course_sections (teaching_schedule_id, course_id, nrc, section_number)
        VALUES (v_schedule_id, v_course_id, fn_generate_unique_nrc(), v_section_number)
        ON CONFLICT (teaching_schedule_id, course_id, section_number) DO NOTHING;

        SELECT id INTO v_section_id
          FROM course_sections
         WHERE teaching_schedule_id = v_schedule_id
           AND course_id = v_course_id
           AND section_number = v_section_number;

        INSERT INTO course_schedule_assignments (
            teaching_schedule_id, course_id, course_component_id, teacher_id,
            assignment_status, max_capacity, enrolled_count, section_id
        )
        VALUES (
            v_schedule_id, v_course_id, v_component_id, v_teacher_id,
            'DRAFT', COALESCE((v_offer->>'max_capacity')::INTEGER, 0), 0, v_section_id
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
                    v_assignment_id, v_schedule_id, v_course_id, v_component_id,
                    v_teacher_id, v_classroom_id, v_slot_id, v_slot_start, v_slot_end
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

-- 5. Listado y confirmación.
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
    SELECT ts.id, ts.academic_period_id, ts.status, ts.created_by,
           ts.created_at, ts.updated_at, ts.confirmed_at,
           sr.id, sr.seed,
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

CREATE OR REPLACE FUNCTION fn_confirm_teaching_schedule(
    p_schedule_id  UUID,
    p_confirmed_by UUID
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
       SET status = 'CANCELLED', updated_at = NOW()
     WHERE academic_period_id = v_period_id
       AND id <> p_schedule_id
       AND status IN ('DRAFT', 'CONFIRMED');

    UPDATE course_schedule_assignments csa
       SET assignment_status = 'CANCELLED', updated_at = NOW()
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
       SET assignment_status = 'CONFIRMED', updated_at = NOW()
     WHERE teaching_schedule_id = p_schedule_id
       AND assignment_status <> 'CANCELLED';

    RETURN p_schedule_id;
END;
$$;
