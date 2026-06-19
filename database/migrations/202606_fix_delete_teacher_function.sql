-- fn_delete_teacher referenciaba la tabla course_teacher_candidates, eliminada/renombrada
-- en una migración posterior (reemplazada por teacher_courses/teacher_course_components).
-- Como consecuencia, la función fallaba siempre con
-- "relation course_teacher_candidates does not exist" al intentar borrar un docente.

CREATE OR REPLACE FUNCTION fn_delete_teacher(p_teacher_id UUID)
RETURNS VOID AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments
    WHERE  teacher_id = p_teacher_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene % asignación(es) en horarios y no puede eliminarse. Desactívelo en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM teacher_courses WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_course_components WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_availability WHERE teacher_id = p_teacher_id;
    DELETE FROM teachers WHERE id = p_teacher_id;
END;
$$ LANGUAGE plpgsql;
