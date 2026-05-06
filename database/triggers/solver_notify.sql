-- ============================================================
--  Solver real-time notifications
--  Emits NOTIFY 'solver_inputs_changed' with the table name as
--  payload whenever data relevant to the CSP solver changes.
--  The solver microservice LISTENs and rebroadcasts via WebSocket.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_solver_inputs_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify('solver_inputs_changed', TG_TABLE_NAME);
    RETURN NULL;
END;
$$;

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'courses',
        'teachers',
        'classrooms',
        'time_slots',
        'teacher_courses',
        'classroom_courses',
        'teacher_availability',
        'classroom_availability',
        'course_prerequisites',
        'course_corequisites',
        'students',
        'building_travel_times',
        'course_schedule_assignments',
        'course_assignment_slots',
        'teaching_schedules'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_notify_solver_%I ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_notify_solver_%I
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH STATEMENT
                EXECUTE FUNCTION fn_notify_solver_inputs_changed()',
            t, t
        );
    END LOOP;
END $$;
