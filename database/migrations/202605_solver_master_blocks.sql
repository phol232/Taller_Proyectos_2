-- Migración: bloques maestros de 90 minutos para el solver
-- Fecha: 2026-04-29

-- 1. Sembrar slots institucionales exactos:
--    07:00-08:30, 08:40-10:10, 10:20-11:50, 12:00-13:30,
--    14:00-15:30, 15:40-17:10, 17:20-18:50, 19:00-20:30,
--    20:40-22:10.
WITH days(day_of_week) AS (
    SELECT unnest(ARRAY[
        'MONDAY'::day_of_week,
        'TUESDAY'::day_of_week,
        'WEDNESDAY'::day_of_week,
        'THURSDAY'::day_of_week,
        'FRIDAY'::day_of_week,
        'SATURDAY'::day_of_week,
        'SUNDAY'::day_of_week
    ])
),
starts(start_time) AS (
    SELECT unnest(ARRAY[
        TIME '07:00',
        TIME '08:40',
        TIME '10:20',
        TIME '12:00',
        TIME '14:00',
        TIME '15:40',
        TIME '17:20',
        TIME '19:00',
        TIME '20:40'
    ])
)
INSERT INTO time_slots(day_of_week, start_time, end_time, slot_order, is_active)
SELECT d.day_of_week,
       s.start_time,
       s.start_time + INTERVAL '90 minutes',
       EXTRACT(HOUR FROM s.start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM s.start_time)::INTEGER,
       TRUE
  FROM days d
 CROSS JOIN starts s
ON CONFLICT (day_of_week, start_time, end_time) DO UPDATE
    SET is_active = TRUE,
        slot_order = EXCLUDED.slot_order,
        updated_at = NOW();

-- 2. Persistir el rango real de cada bloque asignado, no solo la ventana de disponibilidad.
ALTER TABLE course_assignment_slots
    ADD COLUMN IF NOT EXISTS slot_start_time TIME,
    ADD COLUMN IF NOT EXISTS slot_end_time   TIME;

UPDATE course_assignment_slots cas
   SET slot_start_time = COALESCE(cas.slot_start_time, ts.start_time),
       slot_end_time   = COALESCE(cas.slot_end_time, ts.start_time + INTERVAL '90 minutes')
  FROM time_slots ts
 WHERE ts.id = cas.time_slot_id
   AND (cas.slot_start_time IS NULL OR cas.slot_end_time IS NULL);

ALTER TABLE course_assignment_slots
    ALTER COLUMN slot_start_time SET NOT NULL,
    ALTER COLUMN slot_end_time SET NOT NULL;

ALTER TABLE course_assignment_slots
    DROP CONSTRAINT IF EXISTS uq_course_assignment_slots_assignment,
    DROP CONSTRAINT IF EXISTS uq_course_assignment_slots_teacher,
    DROP CONSTRAINT IF EXISTS uq_course_assignment_slots_classroom,
    DROP CONSTRAINT IF EXISTS chk_course_assignment_slot_block_range,
    DROP CONSTRAINT IF EXISTS chk_course_assignment_slot_block_duration;

ALTER TABLE course_assignment_slots
    ADD CONSTRAINT chk_course_assignment_slot_block_range
        CHECK (slot_end_time > slot_start_time),
    ADD CONSTRAINT chk_course_assignment_slot_block_duration
        CHECK (slot_end_time = slot_start_time + INTERVAL '90 minutes');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM course_assignment_slots
         GROUP BY course_assignment_id, time_slot_id, slot_start_time, slot_end_time
        HAVING COUNT(*) > 1
    ) THEN
        ALTER TABLE course_assignment_slots
            ADD CONSTRAINT uq_course_assignment_slots_assignment
                UNIQUE (course_assignment_id, time_slot_id, slot_start_time, slot_end_time);
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM course_assignment_slots
         GROUP BY teaching_schedule_id, teacher_id, time_slot_id, slot_start_time, slot_end_time
        HAVING COUNT(*) > 1
    ) THEN
        ALTER TABLE course_assignment_slots
            ADD CONSTRAINT uq_course_assignment_slots_teacher
                UNIQUE (teaching_schedule_id, teacher_id, time_slot_id, slot_start_time, slot_end_time);
    ELSE
        RAISE NOTICE 'uq_course_assignment_slots_teacher omitida por duplicados legacy';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM course_assignment_slots
         GROUP BY teaching_schedule_id, classroom_id, time_slot_id, slot_start_time, slot_end_time
        HAVING COUNT(*) > 1
    ) THEN
        ALTER TABLE course_assignment_slots
            ADD CONSTRAINT uq_course_assignment_slots_classroom
                UNIQUE (teaching_schedule_id, classroom_id, time_slot_id, slot_start_time, slot_end_time);
    ELSE
        RAISE NOTICE 'uq_course_assignment_slots_classroom omitida por duplicados legacy';
    END IF;
END;
$$;

-- 3. Funciones actualizadas del solver.
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
