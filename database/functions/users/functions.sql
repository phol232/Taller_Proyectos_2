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
    UPDATE users
    SET    is_active = FALSE
    WHERE  id = p_user_id;
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