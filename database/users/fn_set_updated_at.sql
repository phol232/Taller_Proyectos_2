-- Función reutilizable para actualizar automáticamente la columna updated_at.
-- Aplica a cualquier tabla que tenga esa columna.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
