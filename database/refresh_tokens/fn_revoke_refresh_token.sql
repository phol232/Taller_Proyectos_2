-- Revoca un refresh token específico por su hash.
-- Parámetros:
--   p_token_hash : SHA-256 hex del token a revocar
--   p_now        : timestamp de revocación (pasado desde la app para consistencia)

CREATE OR REPLACE FUNCTION fn_revoke_refresh_token(
    p_token_hash VARCHAR(64),
    p_now        TIMESTAMPTZ
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
    WHERE  token_hash = p_token_hash
      AND  revoked    = FALSE;
END;
$$;
