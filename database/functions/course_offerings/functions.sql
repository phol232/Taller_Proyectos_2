-- ============================================================
--  Funciones de gestión de course_offerings y course_sections
-- ============================================================

-- ----------------------------------------------------------
-- fn_create_course_offering
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_course_offering(
    p_academic_period_id  UUID,
    p_course_id           UUID,
    p_expected_enrollment INTEGER,
    p_status              VARCHAR(20)
)
RETURNS course_offerings
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    INSERT INTO course_offerings(academic_period_id, course_id, expected_enrollment, status)
    VALUES (
        p_academic_period_id,
        p_course_id,
        COALESCE(p_expected_enrollment, 0),
        UPPER(TRIM(p_status))
    )
    RETURNING * INTO v_offering;
    RETURN v_offering;
END;
$$;

-- ----------------------------------------------------------
-- fn_update_course_offering
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_course_offering(
    p_offering_id          UUID,
    p_academic_period_id   UUID,
    p_course_id            UUID,
    p_expected_enrollment  INTEGER,
    p_status               VARCHAR(20)
)
RETURNS course_offerings
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    UPDATE course_offerings
    SET    academic_period_id  = p_academic_period_id,
           course_id           = p_course_id,
           expected_enrollment = COALESCE(p_expected_enrollment, 0),
           status              = UPPER(TRIM(p_status))
    WHERE  id = p_offering_id
    RETURNING * INTO v_offering;
    RETURN v_offering;
END;
$$;

-- ----------------------------------------------------------
-- fn_get_course_offering_by_id
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_course_offering_by_id(
    p_offering_id UUID
)
RETURNS course_offerings
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_offering course_offerings;
BEGIN
    SELECT * INTO v_offering
    FROM   course_offerings
    WHERE  id = p_offering_id;
    RETURN v_offering;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_all_course_offerings
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_course_offerings()
RETURNS SETOF course_offerings
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   course_offerings
    ORDER  BY created_at DESC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_course_offerings
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_course_offerings(
    p_query VARCHAR(255)
)
RETURNS SETOF course_offerings
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT co.*
    FROM   course_offerings co
    JOIN   academic_periods ap ON ap.id = co.academic_period_id
    JOIN   courses c ON c.id = co.course_id
    WHERE  c.code ILIKE '%' || p_query || '%'
       OR  c.name ILIKE '%' || p_query || '%'
       OR  ap.code ILIKE '%' || p_query || '%'
       OR  ap.name ILIKE '%' || p_query || '%'
    ORDER  BY co.created_at DESC;
END;
$$;

-- ----------------------------------------------------------
-- fn_cancel_course_offering
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cancel_course_offering(
    p_offering_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE course_offerings
    SET    status = 'CANCELLED'
    WHERE  id = p_offering_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_delete_course_offering
-- ----------------------------------------------------------
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
BEGIN
    SELECT COUNT(*) INTO v_assignments_count
    FROM   section_assignments sa
    JOIN   course_sections cs ON cs.id = sa.section_id
    WHERE  cs.course_offering_id = p_offering_id;

    IF v_assignments_count > 0 THEN
        RAISE EXCEPTION 'La oferta tiene % asignación(es) en horarios y no puede eliminarse. Cancélela en su lugar.', v_assignments_count
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM section_teacher_candidates
    WHERE  section_id IN (SELECT id FROM course_sections WHERE course_offering_id = p_offering_id);

    DELETE FROM course_sections WHERE course_offering_id = p_offering_id;
    DELETE FROM course_offerings WHERE id = p_offering_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_clear_course_offering_sections
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_clear_course_offering_sections(
    p_offering_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM course_sections
    WHERE  course_offering_id = p_offering_id;
END;
$$;

-- ----------------------------------------------------------
-- fn_create_course_section
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_course_section(
    p_course_offering_id UUID,
    p_section_code       VARCHAR(20),
    p_vacancy_limit      INTEGER,
    p_status             VARCHAR(20)
)
RETURNS course_sections
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_section course_sections;
BEGIN
    INSERT INTO course_sections(course_offering_id, section_code, vacancy_limit, status)
    VALUES (
        p_course_offering_id,
        UPPER(TRIM(p_section_code)),
        p_vacancy_limit,
        UPPER(TRIM(p_status))
    )
    RETURNING * INTO v_section;
    RETURN v_section;
END;
$$;

-- ----------------------------------------------------------
-- fn_add_section_teacher_candidate
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_add_section_teacher_candidate(
    p_section_id      UUID,
    p_teacher_id      UUID,
    p_priority_weight NUMERIC(8,4)
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    INSERT INTO section_teacher_candidates(section_id, teacher_id, priority_weight)
    VALUES (p_section_id, p_teacher_id, COALESCE(p_priority_weight, 1.0))
    ON CONFLICT (section_id, teacher_id) DO UPDATE
        SET priority_weight = EXCLUDED.priority_weight;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_course_sections
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_course_sections(
    p_offering_id UUID
)
RETURNS TABLE(
    id                 UUID,
    course_offering_id UUID,
    section_code       VARCHAR(20),
    vacancy_limit      INTEGER,
    status             VARCHAR(20),
    created_at         TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT cs.id,
           cs.course_offering_id,
           cs.section_code,
           cs.vacancy_limit,
           cs.status,
           cs.created_at,
           cs.updated_at
    FROM   course_sections cs
    WHERE  cs.course_offering_id = p_offering_id
    ORDER  BY cs.section_code ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_section_teacher_candidates
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_section_teacher_candidates(
    p_section_id UUID
)
RETURNS TABLE(
    teacher_id UUID,
    priority_weight NUMERIC(8,4)
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT stc.teacher_id, stc.priority_weight
    FROM   section_teacher_candidates stc
    WHERE  stc.section_id = p_section_id
    ORDER  BY stc.priority_weight DESC, stc.teacher_id ASC;
END;
$$;