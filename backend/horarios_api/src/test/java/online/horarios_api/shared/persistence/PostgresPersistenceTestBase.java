package online.horarios_api.shared.persistence;

import org.junit.jupiter.api.AfterEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.Container;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

import javax.sql.DataSource;
import java.util.List;

/**
 * Base para tests de adaptadores JdbcTemplate contra Postgres real (Testcontainers).
 * Necesario porque los adaptadores invocan funciones PL/pgSQL y tipos enum nativos
 * definidos en el dump real de la base ({@code db/horarios_schema_dump.sql}), que H2
 * no puede ejecutar.
 * <p>
 * El contenedor se levanta una sola vez por JVM (patrón "singleton container" de
 * Testcontainers) y se reutiliza entre todas las clases de test que extienden esta
 * base, truncando las tablas después de cada test para aislar los casos.
 */
public abstract class PostgresPersistenceTestBase {

    protected static final PostgreSQLContainer<?> POSTGRES = createContainer();

    static {
        loadSchema();
    }

    @SuppressWarnings("resource")
    private static PostgreSQLContainer<?> createContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("horarios_db")
                .withUsername("postgres")
                .withPassword("postgres");
        container.start();
        return container;
    }

    private static void loadSchema() {
        loadSqlFile("db/horarios_schema_dump.sql");
        loadSqlFile("db/student_schedule_migrations.sql");
    }

    private static void loadSqlFile(String classpathResource) {
        try {
            String containerPath = "/tmp/" + classpathResource.replace('/', '_');
            POSTGRES.copyFileToContainer(
                    MountableFile.forClasspathResource(classpathResource),
                    containerPath
            );
            Container.ExecResult result = POSTGRES.execInContainer(
                    "psql",
                    "-U", POSTGRES.getUsername(),
                    "-d", POSTGRES.getDatabaseName(),
                    "-v", "ON_ERROR_STOP=1",
                    "-f", containerPath
            );
            if (result.getExitCode() != 0) {
                throw new IllegalStateException(
                        "No se pudo cargar " + classpathResource + " en el contenedor Postgres: "
                                + result.getStderr());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Error cargando " + classpathResource, e);
        }
    }

    protected static DataSource testDataSource() {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(POSTGRES.getJdbcUrl());
        ds.setUsername(POSTGRES.getUsername());
        ds.setPassword(POSTGRES.getPassword());
        return ds;
    }

    protected static JdbcTemplate newJdbcTemplate() {
        return new JdbcTemplate(testDataSource());
    }

    @AfterEach
    protected void truncateAllTables() {
        JdbcTemplate jdbc = newJdbcTemplate();
        List<String> tables = jdbc.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);
        if (!tables.isEmpty()) {
            jdbc.execute("TRUNCATE TABLE " + String.join(", ", tables) + " RESTART IDENTITY CASCADE");
        }
    }
}
