-- Desactivación lógica de una facultad (soft-delete).
-- Cascada: también desactiva las carreras asociadas.
-- Parámetros:
--   p_id : UUID de la facultad
-- Errores:
--   ERRCODE 'P0002' si la facultad no existe.

CREATE OR REPLACE FUNCTION fn_deactivate_facultad(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE facultades
       SET is_active = FALSE
     WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE carreras
       SET is_active = FALSE
     WHERE facultad_id = p_id;
END;
$$;
