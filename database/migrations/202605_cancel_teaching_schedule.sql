-- =============================================================
--  fn_cancel_teaching_schedule
--  Marca un borrador como CANCELLED.
--  Idempotente para soportar doble click, refresh tardío o borradores
--  ya cancelados por confirmar otra opción.
-- =============================================================

DROP FUNCTION IF EXISTS fn_cancel_teaching_schedule(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_cancel_teaching_schedule(
    p_schedule_id  UUID,
    p_cancelled_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status
      FROM teaching_schedules
     WHERE id = p_schedule_id;

    IF v_status IS NULL OR v_status = 'CANCELLED' THEN
        RETURN;
    END IF;

    IF v_status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'No se puede eliminar un horario confirmado: %', p_schedule_id
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE teaching_schedules
       SET status     = 'CANCELLED',
           updated_at = NOW()
     WHERE id     = p_schedule_id
       AND status  = 'DRAFT';

    UPDATE course_schedule_assignments
       SET assignment_status = 'CANCELLED',
           updated_at = NOW()
     WHERE teaching_schedule_id = p_schedule_id
       AND assignment_status = 'DRAFT';
END;
$$;
