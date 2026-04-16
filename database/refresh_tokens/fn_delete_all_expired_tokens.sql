-- Limpieza global: elimina TODOS los refresh tokens expirados o revocados.
-- Ejecutada periódicamente por un @Scheduled en la aplicación.
-- Parámetros:
--   p_now : timestamp actual

CREATE OR REPLACE FUNCTION fn_delete_all_expired_tokens(
    p_now TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE  revoked    = TRUE
       OR  expires_at < p_now;
END;
$$;
