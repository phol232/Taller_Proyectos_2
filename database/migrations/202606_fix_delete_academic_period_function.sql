-- fn_delete_academic_period referenciaba la tabla course_offerings, eliminada en
-- 202604_remove_course_offerings_add_classroom_courses.sql. Como consecuencia, la
-- función fallaba siempre con "relation course_offerings does not exist" y nunca
-- llegaba a validar los bloqueos reales (teaching_schedules, student_schedules).

CREATE OR REPLACE FUNCTION fn_delete_academic_period(p_period_id UUID)
RETURNS VOID AS $$
DECLARE
    v_teaching_schedules      INTEGER;
    v_student_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_teaching_schedules
    FROM   teaching_schedules WHERE academic_period_id = p_period_id;

    IF v_teaching_schedules > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) docente(s) y no puede eliminarse.', v_teaching_schedules
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_schedules_count
    FROM   student_schedules WHERE academic_period_id = p_period_id;

    IF v_student_schedules_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % horario(s) de estudiantes y no puede eliminarse.', v_student_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM academic_periods WHERE id = p_period_id;
END;
$$ LANGUAGE plpgsql;
