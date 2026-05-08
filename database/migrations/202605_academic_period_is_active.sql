-- Agrega soporte para is_active en create/update de períodos académicos
-- y crea fn_activate_academic_period como simétrico de deactivate.
-- Fecha: 2025-05-07

CREATE OR REPLACE FUNCTION fn_create_academic_period(
    p_code                VARCHAR(50),
    p_name                VARCHAR(150),
    p_starts_at           DATE,
    p_ends_at             DATE,
    p_status              VARCHAR(20),
    p_max_student_credits INTEGER,
    p_is_active           BOOLEAN DEFAULT TRUE
)
RETURNS academic_periods
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period academic_periods;
BEGIN
    INSERT INTO academic_periods(code, name, starts_at, ends_at, status, max_student_credits, is_active)
    VALUES (
        TRIM(p_code),
        TRIM(p_name),
        p_starts_at,
        p_ends_at,
        UPPER(TRIM(p_status)),
        COALESCE(p_max_student_credits, 22),
        COALESCE(p_is_active, TRUE)
    )
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;

CREATE OR REPLACE FUNCTION fn_update_academic_period(
    p_period_id           UUID,
    p_code                VARCHAR(50),
    p_name                VARCHAR(150),
    p_starts_at           DATE,
    p_ends_at             DATE,
    p_status              VARCHAR(20),
    p_max_student_credits INTEGER,
    p_is_active           BOOLEAN
)
RETURNS academic_periods
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
DECLARE
    v_period academic_periods;
BEGIN
    UPDATE academic_periods
    SET    code                = TRIM(p_code),
           name                = TRIM(p_name),
           starts_at           = p_starts_at,
           ends_at             = p_ends_at,
           status              = UPPER(TRIM(p_status)),
           max_student_credits = COALESCE(p_max_student_credits, 22),
           is_active           = COALESCE(p_is_active, is_active)
    WHERE  id = p_period_id
    RETURNING * INTO v_period;
    RETURN v_period;
END;
$$;

CREATE OR REPLACE FUNCTION fn_activate_academic_period(
    p_period_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $$
BEGIN
    UPDATE academic_periods
    SET    is_active = TRUE
    WHERE  id = p_period_id;
END;
$$;
