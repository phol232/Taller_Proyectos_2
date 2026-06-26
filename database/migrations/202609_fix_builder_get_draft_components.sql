-- ============================================================
-- 202609_fix_builder_get_draft_components.sql
-- Corrige fn_student_builder_get_draft: al agrupar por NRC/sección
-- se partía un curso con teoría+práctica en filas distintas y solo
-- aparecía un componente en "Componentes matriculados".
-- ============================================================

DROP FUNCTION IF EXISTS fn_student_builder_get_draft(UUID, UUID);

CREATE OR REPLACE FUNCTION fn_student_builder_get_draft(
    p_student_id  UUID,
    p_period_id   UUID
)
RETURNS TABLE (
    schedule_id       UUID,
    option_index      SMALLINT,
    status            VARCHAR,
    draft_source      VARCHAR,
    credit_limit      INTEGER,
    total_credits     INTEGER,
    expires_at        TIMESTAMPTZ,
    seconds_remaining INTEGER,
    live_draft_count  INTEGER,
    items             JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_schedule_id UUID;
BEGIN
    SELECT ss.id INTO v_schedule_id
      FROM student_schedules ss
     WHERE ss.student_id = p_student_id
       AND ss.academic_period_id = p_period_id
       AND ss.status = 'DRAFT'
       AND ss.draft_source = 'MANUAL'
     ORDER BY ss.updated_at DESC
     LIMIT 1;

    IF v_schedule_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH item_data AS (
        SELECT ssi.id              AS item_id,
               ssi.course_id,
               c.code              AS course_code,
               c.name              AS course_name,
               c.credits           AS course_credits,
               (
                   SELECT cs2.nrc
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS nrc,
               (
                   SELECT cs2.section_number
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     LEFT JOIN course_sections cs2 ON cs2.id = csa2.section_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_number,
               (
                   SELECT csa2.section_id
                     FROM student_schedule_item_components ssic2
                     JOIN course_schedule_assignments csa2 ON csa2.id = ssic2.course_assignment_id
                     JOIN course_components cc2 ON cc2.id = ssic2.course_component_id
                    WHERE ssic2.student_schedule_item_id = ssi.id
                    ORDER BY cc2.sort_order
                    LIMIT 1
               ) AS section_id,
               JSONB_AGG(
                 JSONB_BUILD_OBJECT(
                   'course_component_id',  ssic.course_component_id,
                   'course_assignment_id', ssic.course_assignment_id,
                   'component_type',       cc.component_type
                 )
                 ORDER BY cc.sort_order
               ) AS components_json
          FROM student_schedule_items ssi
          JOIN courses c ON c.id = ssi.course_id
          JOIN student_schedule_item_components ssic ON ssic.student_schedule_item_id = ssi.id
          JOIN course_components cc ON cc.id = ssic.course_component_id
         WHERE ssi.student_schedule_id = v_schedule_id
           AND ssi.item_status = 'ACTIVE'
         GROUP BY ssi.id, ssi.course_id, c.code, c.name, c.credits
    )
    SELECT v_schedule_id,
           ss.option_index,
           ss.status::VARCHAR,
           ss.draft_source,
           st.credit_limit,
           COALESCE((SELECT SUM(c.credits)::INTEGER
                       FROM student_schedule_items si
                       JOIN courses c ON c.id = si.course_id
                      WHERE si.student_schedule_id = v_schedule_id
                        AND si.item_status = 'ACTIVE'), 0),
           MIN(sh.expires_at),
           GREATEST(0, EXTRACT(EPOCH FROM (MIN(sh.expires_at) - NOW()))::INTEGER),
           (SELECT COUNT(*)::INTEGER
              FROM student_schedules s2
             WHERE s2.student_id = p_student_id
               AND s2.academic_period_id = p_period_id
               AND s2.status = 'DRAFT'
               AND EXISTS (
                   SELECT 1 FROM seat_holds h
                    WHERE h.student_schedule_id = s2.id
                      AND h.status = 'ACTIVE'
                      AND h.expires_at > NOW()
               )),
           COALESCE(
             (SELECT JSONB_AGG(
                       JSONB_BUILD_OBJECT(
                         'item_id',         id.item_id,
                         'course_id',       id.course_id,
                         'course_code',     id.course_code,
                         'course_name',     id.course_name,
                         'course_credits',  id.course_credits,
                         'section_id',      id.section_id,
                         'nrc',             id.nrc,
                         'section_number',  id.section_number,
                         'components',      id.components_json
                       )
                       ORDER BY id.course_code
                     ) FROM item_data id),
             '[]'::JSONB
           )
      FROM student_schedules ss
      JOIN students st ON st.id = ss.student_id
 LEFT JOIN seat_holds sh ON sh.student_schedule_id = ss.id
                        AND sh.status = 'ACTIVE'
                        AND sh.expires_at > NOW()
     WHERE ss.id = v_schedule_id
     GROUP BY ss.option_index, ss.status, ss.draft_source, st.credit_limit;
END;
$$;
