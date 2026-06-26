-- ============================================================
-- 202608_fix_builder_hold_reimport.sql
-- Corrige reimportación al builder manual: evita violar
-- uq_seat_holds_active_per_assignment al volver a pulsar
-- "Ajustar manualmente" sobre la misma opción solver.
-- ============================================================

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
DECLARE
    v_target_id   UUID;
    v_item        RECORD;
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

    v_target_id := fn_student_builder_ensure_draft(
        p_student_id, p_academic_period_id, p_actor_id, p_ttl_seconds, p_max_live_drafts
    );

    DELETE FROM seat_holds WHERE student_schedule_id = v_target_id;
    DELETE FROM student_schedule_item_components ssic
     USING student_schedule_items ssi
     WHERE ssic.student_schedule_item_id = ssi.id
       AND ssi.student_schedule_id = v_target_id;
    DELETE FROM student_schedule_items WHERE student_schedule_id = v_target_id;

    FOR v_item IN
        SELECT ssi.course_id,
               ARRAY_AGG(ssic.course_assignment_id ORDER BY ssic.course_component_id) AS assignment_ids
          FROM student_schedule_items ssi
          JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
         WHERE ssi.student_schedule_id = p_source_schedule_id
           AND ssi.item_status = 'ACTIVE'
         GROUP BY ssi.course_id, ssi.id
    LOOP
        PERFORM fn_student_builder_add_course(
            p_student_id, v_target_id, v_item.course_id,
            v_item.assignment_ids, p_actor_id, p_ttl_seconds
        );
    END LOOP;

    RETURN v_target_id;
END;
$$;
