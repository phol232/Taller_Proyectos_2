-- ============================================================
--  Funciones de gestión de password reset tokens
-- ============================================================

-- ----------------------------------------------------------
-- fn_invalidate_user_prt
-- Marca como usados todos los tokens de recuperación activos
-- de un usuario. Se invoca antes de emitir nuevo OTP.
-- ----------------------------------------------------------
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