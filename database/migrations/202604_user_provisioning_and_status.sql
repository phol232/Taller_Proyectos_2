-- Provision academic records from user creation and add user activation toggles.

DROP FUNCTION IF EXISTS fn_provision_user_academic_identity(UUID);
DROP FUNCTION IF EXISTS fn_create_user(VARCHAR, VARCHAR, VARCHAR, user_role, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS fn_set_user_access_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS fn_deactivate_user(UUID);
DROP FUNCTION IF EXISTS fn_get_teacher_by_id(UUID);
DROP FUNCTION IF EXISTS fn_list_all_teachers();
DROP FUNCTION IF EXISTS fn_search_teachers(VARCHAR);

CREATE OR REPLACE FUNCTION fn_provision_user_academic_identity(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_user users;
    v_academic_code VARCHAR(50);
BEGIN
    SELECT * INTO v_user
    FROM   users
    WHERE  id = p_user_id;

    IF v_user.id IS NULL THEN
        RETURN;
    END IF;

    v_academic_code := UPPER(
        LEFT(REGEXP_REPLACE(SPLIT_PART(v_user.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g'), 41)
        || '-' ||
        LEFT(v_user.id::TEXT, 8)
    );

    IF v_user.role = 'STUDENT'::user_role
       AND NOT EXISTS (SELECT 1 FROM students WHERE user_id = v_user.id) THEN
        INSERT INTO students(user_id, code, full_name, cycle, career, credit_limit, is_active)
        VALUES (v_user.id, v_academic_code, v_user.full_name, 1, NULL, 22, v_user.is_active);
    ELSIF v_user.role = 'TEACHER'::user_role
       AND NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user.id) THEN
        INSERT INTO teachers(user_id, code, full_name, specialty, is_active)
        VALUES (v_user.id, v_academic_code, v_user.full_name, 'Sin especialidad', v_user.is_active);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_create_user(
    p_email          VARCHAR(255),
    p_password_hash  VARCHAR(255),
    p_full_name      VARCHAR(255),
    p_role           user_role,
    p_is_active      BOOLEAN DEFAULT TRUE,
    p_email_verified BOOLEAN DEFAULT FALSE
)
RETURNS users
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_user users;
BEGIN
    INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        is_active,
        email_verified
    )
    VALUES (
        LOWER(TRIM(p_email)),
        p_password_hash,
        TRIM(p_full_name),
        p_role,
        COALESCE(p_is_active, TRUE),
        COALESCE(p_email_verified, FALSE)
    )
    RETURNING * INTO v_user;

    PERFORM fn_provision_user_academic_identity(v_user.id);

    RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_user_access_status(
    p_user_id UUID,
    p_is_active BOOLEAN
)
RETURNS users
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_user users;
BEGIN
    UPDATE users
    SET    is_active = COALESCE(p_is_active, FALSE),
           email_verified = COALESCE(p_is_active, FALSE)
    WHERE  id = p_user_id;

    UPDATE students
    SET    is_active = COALESCE(p_is_active, FALSE)
    WHERE  user_id = p_user_id;

    UPDATE teachers
    SET    is_active = COALESCE(p_is_active, FALSE)
    WHERE  user_id = p_user_id;

    SELECT * INTO v_user
    FROM   users
    WHERE  id = p_user_id;

    RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION fn_deactivate_user(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    PERFORM fn_set_user_access_status(p_user_id, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_teacher_by_id(p_teacher_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    code VARCHAR(50),
    full_name VARCHAR(255),
    specialty VARCHAR(255),
    is_active BOOLEAN,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.id = p_teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_list_all_teachers()
RETURNS TABLE(
    id UUID,
    user_id UUID,
    code VARCHAR(50),
    full_name VARCHAR(255),
    specialty VARCHAR(255),
    is_active BOOLEAN,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    ORDER  BY t.full_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_teachers(p_query VARCHAR(255))
RETURNS TABLE(
    id UUID,
    user_id UUID,
    code VARCHAR(50),
    full_name VARCHAR(255),
    specialty VARCHAR(255),
    is_active BOOLEAN,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.code, t.full_name, t.specialty, t.is_active,
           u.email, t.created_at, t.updated_at
    FROM   teachers t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE  t.code ILIKE '%' || p_query || '%'
       OR  t.full_name ILIKE '%' || p_query || '%'
       OR  t.specialty ILIKE '%' || p_query || '%'
       OR  u.email ILIKE '%' || p_query || '%'
    ORDER  BY t.full_name ASC;
END;
$$;
