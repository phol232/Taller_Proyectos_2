-- Revoca todos los refresh tokens activos de un usuario.
-- Útil en logout-all-devices o al cambiar contraseña.
-- Parámetros:
--   p_user_id : UUID del usuario
--   p_now     : timestamp de revocación

CREATE OR REPLACE FUNCTION fn_revoke_all_user_tokens(
    p_user_id UUID,
    p_now     TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE refresh_tokens
    SET    revoked    = TRUE,
           revoked_at = p_now
    WHERE  user_id = p_user_id
      AND  revoked  = FALSE;
END;
$$;
