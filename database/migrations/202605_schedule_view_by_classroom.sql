-- =============================================================
--  fn_get_schedule_timetable
-- =============================================================

DROP FUNCTION IF EXISTS fn_get_schedule_timetable(UUID);

CREATE OR REPLACE FUNCTION fn_get_schedule_timetable(p_teaching_schedule_id UUID)
RETURNS TABLE (
    slot_id              UUID,
    classroom_id         UUID,
    classroom_code       VARCHAR,
    classroom_name       VARCHAR,
    classroom_type       VARCHAR,
    teacher_id           UUID,
    teacher_code         VARCHAR,
    teacher_name         VARCHAR,
    course_id            UUID,
    course_code          VARCHAR,
    course_name          VARCHAR,
    component_type       VARCHAR,
    section_id           UUID,
    nrc                  CHAR(5),
    section_number       SMALLINT,
    day_of_week          day_of_week,
    start_time           TIME,
    end_time             TIME
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cas.id                  AS slot_id,
        cl.id                   AS classroom_id,
        cl.code                 AS classroom_code,
        cl.name                 AS classroom_name,
        cl.room_type            AS classroom_type,
        t.id                    AS teacher_id,
        t.code                  AS teacher_code,
        t.full_name             AS teacher_name,
        c.id                    AS course_id,
        c.code                  AS course_code,
        c.name                  AS course_name,
        cc.component_type       AS component_type,
        cs.id                   AS section_id,
        cs.nrc                  AS nrc,
        cs.section_number       AS section_number,
        ts.day_of_week          AS day_of_week,
        cas.slot_start_time     AS start_time,
        cas.slot_end_time       AS end_time
    FROM course_assignment_slots cas
    JOIN time_slots ts              ON ts.id  = cas.time_slot_id
    JOIN classrooms cl              ON cl.id  = cas.classroom_id
    JOIN teachers t                 ON t.id   = cas.teacher_id
    JOIN courses c                  ON c.id   = cas.course_id
    JOIN course_components cc       ON cc.id  = cas.course_component_id
    JOIN course_schedule_assignments csa
                                    ON csa.id = cas.course_assignment_id
    LEFT JOIN course_sections cs    ON cs.id  = csa.section_id
    WHERE cas.teaching_schedule_id = p_teaching_schedule_id
    ORDER BY cl.code ASC, ts.day_of_week ASC, cas.slot_start_time ASC;
END;
$$;
