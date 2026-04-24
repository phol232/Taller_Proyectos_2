-- ============================================================
-- Migration: lookup courses by code list.
-- Lightweight query used by the admin UI to resolve prerequisite
-- codes without preloading the whole catalog.
-- ============================================================

DROP FUNCTION IF EXISTS fn_find_courses_by_codes(VARCHAR[]);

CREATE OR REPLACE FUNCTION fn_find_courses_by_codes(
    p_codes VARCHAR[]
)
RETURNS SETOF courses
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF p_codes IS NULL OR array_length(p_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT *
    FROM   courses
    WHERE  code = ANY(p_codes)
    ORDER  BY code ASC;
END;
$$;
