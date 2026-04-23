-- Actualiza los datos de una facultad existente.
-- Parámetros:
--   p_id        : UUID de la facultad
--   p_code      : nuevo código
--   p_name      : nuevo nombre
--   p_is_active : nuevo estado (si NULL conserva el actual)
-- Errores:
--   ERRCODE 'P0002' si la facultad no existe.

CREATE OR REPLACE FUNCTION fn_update_facultad(
    p_id         UUID,
    p_code       VARCHAR(20),
    p_name       VARCHAR(255),
    p_is_active  BOOLEAN
)
RETURNS facultades
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    UPDATE facultades
       SET code       = TRIM(p_code),
           name       = TRIM(p_name),
           is_active  = COALESCE(p_is_active, is_active)
     WHERE id = p_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;
