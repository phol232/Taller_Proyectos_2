-- Lista todas las carreras activas (de todas las facultades).
-- Parámetros: (ninguno)
-- Retorna:    SETOF carreras

CREATE OR REPLACE FUNCTION fn_list_carreras()
RETURNS SETOF carreras
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   carreras
    WHERE  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;
