-- Elimina los refresh tokens expirados o revocados de un usuario específico.
-- Se llama antes de crear un nuevo token para mantener la tabla limpia.
-- Parámetros:
--   p_user_id : UUID del usuario
--   p_now     : timestamp actual

CREATE OR REPLACE FUNCTION fn_delete_user_expired_tokens(
    p_user_id UUID,
    p_now     TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE  user_id = p_user_id
      AND  (revoked = TRUE OR expires_at < p_now);
END;
$$;
