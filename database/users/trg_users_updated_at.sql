-- Trigger: actualiza updated_at automáticamente en la tabla users
-- antes de cada UPDATE.

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();
