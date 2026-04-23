-- Crea una facultad. Normaliza code/name con TRIM y la marca como activa.
-- Parámetros:
--   p_code : VARCHAR(20) código único
--   p_name : VARCHAR(255) nombre
-- Retorna:    fila facultades recién insertada.

CREATE OR REPLACE FUNCTION fn_create_facultad(
    p_code  VARCHAR(20),
    p_name  VARCHAR(255)
)
RETURNS facultades
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_row facultades%ROWTYPE;
BEGIN
    INSERT INTO facultades (code, name, is_active)
    VALUES (TRIM(p_code), TRIM(p_name), TRUE)
    RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;
