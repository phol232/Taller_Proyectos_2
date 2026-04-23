-- Lista las carreras activas de una facultad específica.
-- Parámetros:
--   p_facultad_id : UUID de la facultad
-- Retorna:    SETOF carreras

CREATE OR REPLACE FUNCTION fn_list_carreras_by_facultad(p_facultad_id UUID)
RETURNS SETOF carreras
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   carreras
    WHERE  facultad_id = p_facultad_id
      AND  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;
