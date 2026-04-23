-- ============================================================
--  Funciones de gestión de refresh tokens
-- ============================================================

-- ----------------------------------------------------------
-- fn_revoke_refresh_token
-- Revoca un token específico por su hash SHA-256.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_revoke_all_user_tokens
-- Revoca todos los tokens activos de un usuario.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_delete_user_expired_tokens
-- Elimina tokens expirados o revocados de un usuario.
-- ----------------------------------------------------------
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

-- ----------------------------------------------------------
-- fn_delete_all_expired_tokens
-- Limpieza global de tokens expirados o revocados.
-- ----------------------------------------------------------
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