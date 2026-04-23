package online.horarios_api.shared.infrastructure.persistence;

import online.horarios_api.shared.domain.exception.ConflictException;
import org.springframework.dao.DataAccessException;

import java.sql.SQLException;

/**
 * Utilidades para mapear excepciones de la base de datos a excepciones de dominio.
 */
public final class JdbcErrorMapper {

    private JdbcErrorMapper() {}

    /**
     * Intenta mapear una {@link DataAccessException} que envuelve una violación de integridad
     * (ERRCODE 23503 emitido por las funciones fn_delete_*) a una {@link ConflictException}
     * preservando el mensaje legible que generó la base de datos.
     *
     * @return {@link ConflictException} con el mensaje del servidor, o {@code null} si la
     *         excepción no corresponde a una violación de integridad.
     */
    public static ConflictException mapForeignKeyBlock(DataAccessException ex) {
        Throwable cause = ex.getMostSpecificCause();
        if (cause instanceof SQLException sql) {
            String state = sql.getSQLState();
            if ("23503".equals(state) || "23505".equals(state) || "23000".equals(state)) {
                String msg = sql.getMessage();
                if (msg != null) {
                    int newline = msg.indexOf('\n');
                    if (newline > 0) {
                        msg = msg.substring(0, newline);
                    }
                    if (msg.startsWith("ERROR: ")) {
                        msg = msg.substring("ERROR: ".length());
                    }
                }
                return new ConflictException(msg != null && !msg.isBlank()
                        ? msg.trim()
                        : "No se puede eliminar: la operación entra en conflicto con datos existentes.");
            }
        }
        return null;
    }
}
