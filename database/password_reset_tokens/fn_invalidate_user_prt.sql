-- Marca como usados todos los tokens de recuperación de contraseña activos
-- de un usuario (se invoca antes de emitir un nuevo OTP para invalidar los anteriores).
-- Parámetros:
--   p_user_id : UUID del usuario
--   p_now     : timestamp de invalidación (pasado desde la app para consistencia)

CREATE OR REPLACE FUNCTION fn_invalidate_user_prt(
    p_user_id UUID,
    p_now     TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE password_reset_tokens
    SET    used    = TRUE,
           used_at = p_now
    WHERE  user_id = p_user_id
      AND  used    = FALSE;
END;
$$;
