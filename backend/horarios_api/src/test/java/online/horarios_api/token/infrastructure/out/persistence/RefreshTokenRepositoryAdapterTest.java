package online.horarios_api.token.infrastructure.out.persistence;

import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import online.horarios_api.token.domain.model.RefreshToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.sql.DataSource;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@DisplayName("RefreshTokenRepositoryAdapter — persistencia real contra Postgres (Testcontainers)")
class RefreshTokenRepositoryAdapterTest extends PostgresPersistenceTestBase {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired
    private RefreshTokenJpaRepository jpaRepository;

    @Autowired
    private DataSource dataSource;

    private RefreshTokenRepositoryAdapter adapter;
    private UUID userId;

    @Override
    @org.junit.jupiter.api.AfterEach
    protected void truncateAllTables() {
        // @DataJpaTest revierte la transacción de cada test; truncar aquí causaría deadlock.
    }

    @BeforeEach
    void setUp() {
        adapter = new RefreshTokenRepositoryAdapter(jpaRepository);
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        userId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO users (id, email, full_name, role) VALUES (?, ?, ?, 'ADMIN'::user_role)",
                userId, "token-test@continental.edu.pe", "Usuario Token"
        );
    }

    private RefreshToken issue(String tokenHash) {
        return RefreshToken.issueFor(userId, tokenHash, NOW.plus(7, ChronoUnit.DAYS), "127.0.0.1", "JUnit");
    }

    @Test
    @DisplayName("save + findById: persiste y recupera el token")
    void save_andFindById() {
        RefreshToken saved = adapter.save(issue("hash-1"));

        Optional<RefreshToken> found = adapter.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getTokenHash()).isEqualTo("hash-1");
        assertThat(found.get().isRevoked()).isFalse();
    }

    @Test
    @DisplayName("findActiveByTokenHash: solo encuentra tokens no revocados")
    void findActiveByTokenHash_onlyNonRevoked() {
        adapter.save(issue("hash-1"));

        assertThat(adapter.findActiveByTokenHash("hash-1")).isPresent();
        assertThat(adapter.findActiveByTokenHash("no-existe")).isEmpty();
    }

    @Test
    @DisplayName("findActiveSessionsByUserId: devuelve solo tokens vigentes y no revocados")
    void findActiveSessionsByUserId_returnsValidSessions() {
        adapter.save(issue("hash-1"));
        adapter.save(issue("hash-2"));

        List<RefreshToken> sessions = adapter.findActiveSessionsByUserId(userId, NOW);

        assertThat(sessions).hasSize(2);
    }

    @Test
    @DisplayName("revokeByTokenHash: marca el token como revocado")
    void revokeByTokenHash_marksRevoked() {
        RefreshToken saved = adapter.save(issue("hash-1"));

        adapter.revokeByTokenHash("hash-1", NOW);

        assertThat(adapter.findById(saved.getId()).orElseThrow().isRevoked()).isTrue();
        assertThat(adapter.findActiveByTokenHash("hash-1")).isEmpty();
    }

    @Test
    @DisplayName("revokeAllByUserId: revoca todas las sesiones activas del usuario")
    void revokeAllByUserId_revokesAllSessions() {
        adapter.save(issue("hash-1"));
        adapter.save(issue("hash-2"));

        adapter.revokeAllByUserId(userId, NOW);

        assertThat(adapter.findActiveSessionsByUserId(userId, NOW)).isEmpty();
    }

    @Test
    @DisplayName("deleteExpiredOrRevokedByUserId: elimina tokens revocados o expirados del usuario")
    void deleteExpiredOrRevokedByUserId_removesStaleTokens() {
        RefreshToken saved = adapter.save(issue("hash-1"));
        adapter.revokeByTokenHash("hash-1", NOW);

        adapter.deleteExpiredOrRevokedByUserId(userId, NOW);

        assertThat(adapter.findById(saved.getId())).isEmpty();
    }

    @Test
    @DisplayName("deleteAllExpiredOrRevoked: elimina tokens revocados o expirados de cualquier usuario")
    void deleteAllExpiredOrRevoked_removesStaleTokensGlobally() {
        RefreshToken saved = adapter.save(issue("hash-1"));
        adapter.revokeByTokenHash("hash-1", NOW);

        adapter.deleteAllExpiredOrRevoked(NOW);

        assertThat(adapter.findById(saved.getId())).isEmpty();
    }
}
