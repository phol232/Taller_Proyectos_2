-- Migration: add many-to-many relationship between teachers and courses.

CREATE TABLE IF NOT EXISTS teacher_courses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID        NOT NULL,
    course_id   UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_courses_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_courses_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_teacher_courses UNIQUE (teacher_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_courses_teacher_id ON teacher_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_courses_course_id ON teacher_courses(course_id);

DROP TRIGGER IF EXISTS trg_teacher_courses_updated_at ON teacher_courses;
CREATE TRIGGER trg_teacher_courses_updated_at
    BEFORE UPDATE ON teacher_courses
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_add_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.id = ANY(p_course_ids)
    ON CONFLICT (teacher_id, course_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION fn_add_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO teacher_courses(teacher_id, course_id)
    SELECT p_teacher_id, c.id
    FROM   courses c
    WHERE  c.code = ANY(
        ARRAY(
            SELECT DISTINCT UPPER(TRIM(code_value))
            FROM   unnest(p_course_codes) AS code_value
            WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
        )
    )
    ON CONFLICT (teacher_id, course_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION fn_remove_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_ids IS NULL OR array_length(p_course_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id
       AND course_id = ANY(p_course_ids);
END;
$$;

CREATE OR REPLACE FUNCTION fn_remove_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    IF p_course_codes IS NULL OR array_length(p_course_codes, 1) IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM teacher_courses tc
    USING courses c
    WHERE tc.teacher_id = p_teacher_id
      AND tc.course_id = c.id
      AND c.code = ANY(
          ARRAY(
              SELECT DISTINCT UPPER(TRIM(code_value))
              FROM   unnest(p_course_codes) AS code_value
              WHERE  NULLIF(TRIM(code_value), '') IS NOT NULL
          )
      );
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_teacher_courses(
    p_teacher_id  UUID,
    p_course_ids  UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses(p_teacher_id, p_course_ids);
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_teacher_courses_by_codes(
    p_teacher_id    UUID,
    p_course_codes  VARCHAR[]
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM teacher_courses
    WHERE  teacher_id = p_teacher_id;

    PERFORM fn_add_teacher_courses_by_codes(p_teacher_id, p_course_codes);
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_teacher_course_codes(
    p_teacher_id UUID
)
RETURNS TABLE(course_code VARCHAR(50))
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.code
    FROM   teacher_courses tc
    JOIN   courses c ON c.id = tc.course_id
    WHERE  tc.teacher_id = p_teacher_id
    ORDER  BY c.code ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_course_teacher_ids(
    p_course_id UUID
)
RETURNS TABLE(teacher_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id
    FROM   teacher_courses tc
    JOIN   teachers t ON t.id = tc.teacher_id
    WHERE  tc.course_id = p_course_id
    ORDER  BY t.full_name ASC;
END;
$$;
