-- ============================================================
--  Funciones de autenticación y gestión de usuarios
-- ============================================================

-- ----------------------------------------------------------
-- fn_set_updated_at
-- Función trigger genérica: actualiza updated_at automáticamente.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------
-- fn_provision_user_academic_identity
-- Crea la ficha académica mínima del usuario según su rol.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_create_user
-- Crea un usuario con credenciales email/password.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_set_user_access_status
-- Activa/desactiva usuario y mantiene verificación de email sincronizada.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_deactivate_user
-- Desactivación lógica (soft-delete). No elimina la fila.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_list_all_users
-- Lista todos los usuarios ordenados por fecha de creación.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_all_users()
RETURNS SETOF users
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   users
    ORDER  BY created_at DESC;
END;
$$;

-- ----------------------------------------------------------
-- fn_search_users_by_name
-- Busca por nombre (case-insensitive).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_users_by_name(
    p_query VARCHAR(255)
)
RETURNS SETOF users
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   users
    WHERE  full_name ILIKE '%' || p_query || '%'
    ORDER  BY full_name ASC;
END;
$$;

-- ----------------------------------------------------------
-- fn_list_users_paged
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_users_paged(
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id              UUID,
    email           VARCHAR(255),
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255),
    role            user_role,
    is_active       BOOLEAN,
    email_verified  BOOLEAN,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    total_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    ORDER  BY u.created_at DESC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;

-- ----------------------------------------------------------
-- fn_search_users_paged
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_users_paged(
    p_query     VARCHAR(255),
    p_page      INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS TABLE(
    id              UUID,
    email           VARCHAR(255),
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255),
    role            user_role,
    is_active       BOOLEAN,
    email_verified  BOOLEAN,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    total_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role,
           u.is_active, u.email_verified, u.avatar_url,
           u.created_at, u.updated_at,
           COUNT(*) OVER()::BIGINT AS total_count
    FROM   users u
    WHERE  u.full_name ILIKE '%' || p_query || '%'
       OR  u.email     ILIKE '%' || p_query || '%'
    ORDER  BY u.full_name ASC
    LIMIT  GREATEST(p_page_size, 1)
    OFFSET (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
END;
$$;
