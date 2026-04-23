-- Lista TODAS las facultades (incluye inactivas). Uso administrativo.
-- Parámetros: (ninguno)
-- Retorna:    SETOF facultades

CREATE OR REPLACE FUNCTION fn_list_all_facultades()
RETURNS SETOF facultades
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   facultades
    ORDER  BY name ASC;
END;
$$;
