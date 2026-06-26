package online.horarios_api.user.infrastructure.out.persistence;

import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import online.horarios_api.user.domain.model.Role;
import online.horarios_api.user.domain.model.User;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@DisplayName("UserRepositoryAdapter — persistencia real contra Postgres (Testcontainers)")
class UserRepositoryAdapterTest extends PostgresPersistenceTestBase {

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired
    private UserJpaRepository userJpaRepository;

    @Autowired
    private OAuth2LinkedAccountJpaRepository oauth2JpaRepository;

    @Autowired
    private DataSource dataSource;

    private UserRepositoryAdapter adapter;

    @Override
    @org.junit.jupiter.api.AfterEach
    protected void truncateAllTables() {
        // No-op: @DataJpaTest revierte la transacción de cada test, truncar con una conexión externa causaría deadlock.
    }

    @BeforeEach
    void setUp() {
        adapter = new UserRepositoryAdapter(userJpaRepository, oauth2JpaRepository, new JdbcTemplate(dataSource));
    }

    private User sampleUser(String email) {
        return new User(null, email, "hash", "Usuario de Prueba", Role.ADMIN, true, true, null, null, null);
    }

    @Test
    @DisplayName("create: persiste y devuelve el usuario")
    void create_persists() {
        User created = adapter.create(sampleUser("admin@continental.edu.pe"));

        assertThat(created.getId()).isNotNull();
        assertThat(created.getEmail()).isEqualTo("admin@continental.edu.pe");
        assertThat(created.getRole()).isEqualTo(Role.ADMIN);
        assertThat(created.isActive()).isTrue();
    }

    @Test
    @DisplayName("create: email duplicado lanza DuplicateFieldException")
    void create_duplicateEmail_throws() {
        adapter.create(sampleUser("admin@continental.edu.pe"));

        assertThatThrownBy(() -> adapter.create(sampleUser("admin@continental.edu.pe")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("findById / findByEmail: devuelven el usuario creado vía JPA")
    void findById_andFindByEmail_returnUser() {
        User created = adapter.create(sampleUser("docente@continental.edu.pe"));

        Optional<User> byId = adapter.findById(created.getId());
        Optional<User> byEmail = adapter.findByEmail("docente@continental.edu.pe");

        assertThat(byId).isPresent();
        assertThat(byEmail).isPresent();
        assertThat(byId.get().getEmail()).isEqualTo("docente@continental.edu.pe");
    }

    @Test
    @DisplayName("findByEmailAndActiveTrue: no devuelve usuarios inactivos")
    void findByEmailAndActiveTrue_excludesInactive() {
        User created = adapter.create(sampleUser("inactivo@continental.edu.pe"));
        adapter.setAccessStatus(created.getId(), false);

        assertThat(adapter.findByEmailAndActiveTrue("inactivo@continental.edu.pe")).isEmpty();
    }

    @Test
    @DisplayName("setAccessStatus: desactiva el usuario")
    void setAccessStatus_deactivates() {
        User created = adapter.create(sampleUser("estado@continental.edu.pe"));

        User updated = adapter.setAccessStatus(created.getId(), false);

        assertThat(updated.isActive()).isFalse();
    }

    @Test
    @DisplayName("findAll: devuelve todos los usuarios creados")
    void findAll_returnsAll() {
        adapter.create(sampleUser("uno@continental.edu.pe"));
        adapter.create(sampleUser("dos@continental.edu.pe"));

        List<User> all = adapter.findAll();

        assertThat(all).extracting(User::getEmail)
                .containsExactlyInAnyOrder("uno@continental.edu.pe", "dos@continental.edu.pe");
    }

    @Test
    @DisplayName("findByFullNameContaining: filtra por nombre")
    void findByFullNameContaining_filters() {
        adapter.create(new User(null, "ana@continental.edu.pe", "hash", "Ana López",
                Role.STUDENT, true, true, null, null, null));
        adapter.create(new User(null, "luis@continental.edu.pe", "hash", "Luis Pérez",
                Role.STUDENT, true, true, null, null, null));

        List<User> results = adapter.findByFullNameContaining("Ana");

        assertThat(results).extracting(User::getFullName).containsExactly("Ana López");
    }

    @Test
    @DisplayName("findAllPaged: devuelve página con total correcto")
    void findAllPaged_returnsPage() {
        adapter.create(sampleUser("uno@continental.edu.pe"));
        adapter.create(sampleUser("dos@continental.edu.pe"));
        adapter.create(sampleUser("tres@continental.edu.pe"));

        Page<User> page = adapter.findAllPaged(1, 2);

        assertThat(page.content()).hasSize(2);
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("findByFullNameContainingPaged: filtra y pagina")
    void findByFullNameContainingPaged_filtersAndPaginates() {
        adapter.create(new User(null, "ana@continental.edu.pe", "hash", "Ana López",
                Role.STUDENT, true, true, null, null, null));
        adapter.create(new User(null, "ana2@continental.edu.pe", "hash", "Ana Torres",
                Role.STUDENT, true, true, null, null, null));
        adapter.create(new User(null, "luis@continental.edu.pe", "hash", "Luis Pérez",
                Role.STUDENT, true, true, null, null, null));

        Page<User> page = adapter.findByFullNameContainingPaged("Ana", 1, 10);

        assertThat(page.content()).extracting(User::getFullName)
                .containsExactlyInAnyOrder("Ana López", "Ana Torres");
        assertThat(page.totalCount()).isEqualTo(2);
    }
}
