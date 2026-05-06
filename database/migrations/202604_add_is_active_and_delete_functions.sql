-- Migración idempotente: agrega columna is_active a academic_periods
-- y crea las funciones de desactivación/eliminación para las 6 entidades admin.
-- Aplicable sobre bases ya existentes sin necesidad de reinstalar schema.sql.

-- 1) Columna is_active en academic_periods ---------------------------------
ALTER TABLE academic_periods
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Funciones de desactivación / eliminación -----------------------------

CREATE OR REPLACE FUNCTION fn_deactivate_academic_period(
    p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE academic_periods
    SET    is_active = FALSE
    WHERE  id = p_period_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_academic_period(
    p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offerings_count         INTEGER;
    v_teaching_schedules      INTEGER;
    v_student_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE academic_period_id = p_period_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El período tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
            USING ERRCODE = '23503';
    END IF;

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
$$;

CREATE OR REPLACE FUNCTION fn_delete_course(
    p_course_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offerings_count     INTEGER;
    v_prereq_of_count     INTEGER;
    v_completed_count     INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_offerings_count
    FROM   course_offerings WHERE course_id = p_course_id;

    IF v_offerings_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % oferta(s) registrada(s) y no puede eliminarse. Desactívelo en su lugar.', v_offerings_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_prereq_of_count
    FROM   course_prerequisites WHERE prerequisite_course_id = p_course_id;

    IF v_prereq_of_count > 0 THEN
        RAISE EXCEPTION 'El curso es prerrequisito de % curso(s) y no puede eliminarse.', v_prereq_of_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_completed_count
    FROM   student_completed_courses WHERE course_id = p_course_id;

    IF v_completed_count > 0 THEN
        RAISE EXCEPTION 'El curso tiene % aprobación(es) por estudiantes y no puede eliminarse. Desactívelo en su lugar.', v_completed_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_prerequisites WHERE course_id = p_course_id;
    DELETE FROM courses WHERE id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_teacher(
    p_teacher_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
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

    DELETE FROM course_teacher_candidates WHERE teacher_id = p_teacher_id;
    DELETE FROM teacher_availability WHERE teacher_id = p_teacher_id;
    DELETE FROM teachers WHERE id = p_teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_classroom(
    p_classroom_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_assignment_slots
    WHERE  classroom_id = p_classroom_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'El aula tiene % franja(s) asignada(s) en horarios y no puede eliminarse. Desactívela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_offering_classroom_candidates WHERE classroom_id = p_classroom_id;
    DELETE FROM classroom_availability WHERE classroom_id = p_classroom_id;
    DELETE FROM classrooms WHERE id = p_classroom_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_student(
    p_student_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_schedules_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_schedules_count
    FROM   student_schedules
    WHERE  student_id = p_student_id;

    IF v_schedules_count > 0 THEN
        RAISE EXCEPTION 'El estudiante tiene % horario(s) generado(s) y no puede eliminarse. Desactívelo en su lugar.', v_schedules_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM student_completed_courses WHERE student_id = p_student_id;
    DELETE FROM students WHERE id = p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_delete_course_offering(
    p_offering_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_assignments_count INTEGER;
    v_student_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   course_schedule_assignments
    WHERE  course_offering_id = p_offering_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % asignación(es) en horarios y no puede eliminarse. Cancélela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*) INTO v_student_items_count
    FROM   student_schedule_items
    WHERE  course_offering_id = p_offering_id;

    IF v_student_items_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % horario(s) de estudiante y no puede eliminarse. Cancélela en su lugar.', v_student_items_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM course_offering_classroom_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_teacher_candidates WHERE course_offering_id = p_offering_id;
    DELETE FROM course_offerings WHERE id = p_offering_id;
END;
$$;
