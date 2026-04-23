-- Desactivación lógica de una carrera (soft-delete).
-- Parámetros:
--   p_id : UUID de la carrera
-- Errores:
--   ERRCODE 'P0002' si la carrera no existe.

CREATE OR REPLACE FUNCTION fn_deactivate_carrera(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE carreras
       SET is_active = FALSE
     WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;
