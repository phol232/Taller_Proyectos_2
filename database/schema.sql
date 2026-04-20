-- ============================================================
--  Planner UC — Database Schema
--  HU-01: Gestión de Autenticación y Sesiones
--  Base: PostgreSQL 15+
-- ============================================================

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  TIPOS
-- ============================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'TEACHER', 'STUDENT');

-- ============================================================
--  TABLAS DE AUTENTICACIÓN
-- ============================================================

-- Tabla base de usuarios.
-- Soporta login local (email + contraseña) y OAuth2 (Google).
-- Para usuarios solo-OAuth2, password_hash es NULL.
CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255),                           -- NULL para usuarios solo-OAuth2
    full_name       VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Cuentas OAuth2 vinculadas a un usuario del sistema.
-- Permite que un mismo usuario vincule múltiples proveedores en el futuro.
CREATE TABLE oauth2_linked_accounts (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    provider          VARCHAR(50)  NOT NULL,                -- 'google', 'github', etc.
    provider_subject  VARCHAR(255) NOT NULL,                -- claim 'sub' del proveedor
    provider_email    VARCHAR(255),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_oauth2_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_oauth2_provider_subject
        UNIQUE (provider, provider_subject)
);

-- Refresh tokens con rotación.
-- Se almacena únicamente el hash SHA-256 del token real (nunca el token en claro).
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    token_hash  VARCHAR(64) NOT NULL,                       -- SHA-256 hex del token real
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMPTZ,
    ip_address  VARCHAR(45),                                -- IPv4 (15) o IPv6 (45)
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_refresh_token_hash
        UNIQUE (token_hash)
);

-- Tokens OTP para recuperación de contraseña.
-- El código de 6 dígitos se almacena como hash BCrypt (nunca en claro).
-- Flujo: solicitar OTP → verificar OTP → obtener reset_token → cambiar contraseña.
CREATE TABLE password_reset_tokens (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    otp_hash          VARCHAR(255) NOT NULL,     -- BCrypt hash del código OTP de 6 dígitos
    reset_token_hash  VARCHAR(64),               -- SHA-256 del token de reset (se establece al verificar el OTP)
    expires_at        TIMESTAMPTZ NOT NULL,
    verified          BOOLEAN     NOT NULL DEFAULT FALSE,
    verified_at       TIMESTAMPTZ,
    used              BOOLEAN     NOT NULL DEFAULT FALSE,
    used_at           TIMESTAMPTZ,
    verify_attempts   INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prt_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  PERFILES DE USUARIO
--  HU-XX: Gestión de Perfil de Usuario
-- ============================================================

-- Tipos enumerados para perfil
CREATE TYPE sex_type AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- Tabla de perfiles extendidos de usuario.
-- Separada de 'users' para mantener autenticación desacoplada de datos personales.
-- Se crea al completar por primera vez el perfil; 1:1 con users.
CREATE TABLE profiles (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL,
    dni         VARCHAR(20),
    phone       VARCHAR(20),
    sex         sex_type,
    age         SMALLINT        CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_profiles_dni     UNIQUE (dni),
    CONSTRAINT uq_profiles_phone   UNIQUE (phone)
);

-- ============================================================
--  ÍNDICES
-- ============================================================

CREATE INDEX idx_users_email
    ON users(email);

CREATE INDEX idx_users_role
    ON users(role);

CREATE INDEX idx_oauth2_user_id
    ON oauth2_linked_accounts(user_id);

CREATE INDEX idx_oauth2_provider_subject
    ON oauth2_linked_accounts(provider, provider_subject);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_hash
    ON refresh_tokens(token_hash);

-- Índice parcial: solo tokens vigentes (optimiza las consultas de validación)
CREATE INDEX idx_refresh_tokens_active
    ON refresh_tokens(expires_at)
    WHERE revoked = FALSE;

CREATE INDEX idx_prt_user_id
    ON password_reset_tokens(user_id);

CREATE INDEX idx_prt_reset_token_hash
    ON password_reset_tokens(reset_token_hash)
    WHERE reset_token_hash IS NOT NULL;

-- Índice parcial: tokens de reset activos (no usados, no expirados)
CREATE INDEX idx_prt_active
    ON password_reset_tokens(user_id, expires_at)
    WHERE used = FALSE;

-- ============================================================
--  FUNCIONES — Lógica de negocio encapsulada en la base de datos
-- ============================================================

-- -----------------------------------------------------------------------
-- fn_set_updated_at
-- Trigger function genérica: actualiza automáticamente la columna updated_at.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------
-- fn_revoke_refresh_token
-- Revoca un refresh token específico por su hash SHA-256.
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_revoke_all_user_tokens
-- Revoca todos los refresh tokens activos de un usuario.
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_delete_user_expired_tokens
-- Elimina tokens expirados o revocados de un usuario (limpieza pre-creación).
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_delete_all_expired_tokens
-- Limpieza global de tokens expirados o revocados (job periódico).
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_deactivate_user
-- Desactivación lógica de usuario (soft-delete, no elimina la fila).
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_invalidate_user_prt
-- Marca como usados todos los tokens de recuperación activos de un usuario.
-- Se invoca antes de emitir un nuevo OTP para invalidar los anteriores.
-- -----------------------------------------------------------------------
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

-- -----------------------------------------------------------------------
-- fn_upsert_profile
-- Crea o actualiza el perfil de un usuario (INSERT ... ON CONFLICT).
-- Devuelve la fila resultante.
-- Notas:
--   · dni y phone tienen restricciones UNIQUE en la tabla; si otro usuario
--     ya los posee, PostgreSQL lanzará una violación de restricción
--     (uq_profiles_dni / uq_profiles_phone) que la capa de servicio
--     debe capturar y convertir en mensaje de error apropiado.
--   · Se actualiza updated_at mediante el trigger trg_profiles_updated_at.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_upsert_profile(
    p_user_id UUID,
    p_dni     VARCHAR(20),
    p_phone   VARCHAR(20),
    p_sex     sex_type,
    p_age     SMALLINT
)
RETURNS profiles
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_profile profiles;
BEGIN
    INSERT INTO profiles (user_id, dni, phone, sex, age)
    VALUES (p_user_id, p_dni, p_phone, p_sex, p_age)
    ON CONFLICT (user_id) DO UPDATE
        SET dni   = EXCLUDED.dni,
            phone = EXCLUDED.phone,
            sex   = EXCLUDED.sex,
            age   = EXCLUDED.age
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$;

-- -----------------------------------------------------------------------
-- fn_get_profile_by_user_id
-- Devuelve el perfil de un usuario dado su user_id.
-- Retorna NULL si aún no tiene perfil.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_profile_by_user_id(
    p_user_id UUID
)
RETURNS profiles
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_profile profiles;
BEGIN
    SELECT * INTO v_profile
    FROM   profiles
    WHERE  user_id = p_user_id;

    RETURN v_profile;
END;
$$;

-- ============================================================
--  TRIGGERS
-- ============================================================

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

