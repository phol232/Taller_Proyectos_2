-- Lista todas las facultades activas, ordenadas por nombre.
-- Parámetros: (ninguno)
-- Retorna:    SETOF facultades

CREATE OR REPLACE FUNCTION fn_list_facultades()
RETURNS SETOF facultades
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   facultades
    WHERE  is_active = TRUE
    ORDER  BY name ASC;
END;
$$;
