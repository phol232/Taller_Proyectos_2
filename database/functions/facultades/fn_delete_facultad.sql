-- Elimina físicamente una facultad.
-- FK carreras.facultad_id    → ON DELETE CASCADE  (borra carreras asociadas)
-- FK profiles/students.fac…  → ON DELETE SET NULL (desreferencia perfiles)
-- Parámetros:
--   p_id : UUID de la facultad
-- Errores:
--   ERRCODE 'P0002' si la facultad no existe.

CREATE OR REPLACE FUNCTION fn_delete_facultad(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM facultades WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facultad no encontrada: %', p_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;
