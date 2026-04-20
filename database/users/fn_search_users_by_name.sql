CREATE OR REPLACE FUNCTION fn_search_users_by_name(
    p_query VARCHAR(255)
)
RETURNS SETOF users
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM   users
    WHERE  full_name ILIKE '%' || p_query || '%'
    ORDER  BY full_name ASC;
END;
$$;
