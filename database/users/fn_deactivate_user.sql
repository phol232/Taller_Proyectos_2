-- Desactivación lógica de un usuario (soft-delete).
-- No elimina el registro; solo marca is_active = FALSE.
-- Parámetros:
--   p_user_id : UUID del usuario a desactivar

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
