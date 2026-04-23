-- Crea una carrera dentro de una facultad. Valida que la facultad exista.
-- Parámetros:
--   p_facultad_id : UUID de la facultad padre
--   p_code        : código (opcional; NULLIF(TRIM('')) → NULL)
--   p_name        : nombre de la carrera
-- Errores:
--   ERRCODE 'P0002' si la facultad no existe.

CREATE OR REPLACE FUNCTION fn_create_carrera(
    p_facultad_id UUID,
    p_code        VARCHAR(20),
    p_name        VARCHAR(255)
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

    INSERT INTO carreras (facultad_id, code, name, is_active)
    VALUES (p_facultad_id, NULLIF(TRIM(p_code), ''), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;
