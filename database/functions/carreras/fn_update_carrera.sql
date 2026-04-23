-- Actualiza los datos de una carrera.
-- Parámetros:
--   p_id          : UUID de la carrera
--   p_facultad_id : nueva facultad (debe existir)
--   p_code        : nuevo código (opcional)
--   p_name        : nuevo nombre
--   p_is_active   : nuevo estado (si NULL conserva el actual)
-- Errores:
--   ERRCODE 'P0002' si la facultad o la carrera no existen.

CREATE OR REPLACE FUNCTION fn_update_carrera(
    p_id           UUID,
    p_facultad_id  UUID,
    p_code         VARCHAR(20),
    p_name         VARCHAR(255),
    p_is_active    BOOLEAN
)
RETURNS carreras
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row carreras%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facultades WHERE id = p_facultad_id) THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_facultad_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE carreras
       SET facultad_id = p_facultad_id,
           code        = NULLIF(TRIM(p_code), ''),
           name        = TRIM(p_name),
           is_active   = COALESCE(p_is_active, is_active)
     WHERE id = p_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_row;
END;
$$;
