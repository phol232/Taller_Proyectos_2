package online.horarios_api.student.infrastructure.out.persistence;

import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("StudentJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class StudentJdbcAdapterTest extends PostgresPersistenceTestBase {

    private StudentJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new StudentJdbcAdapter(newJdbcTemplate());
    }

    private StudentData sampleData(String code) {
        return new StudentData(null, code, "Estudiante " + code, 3, "Ingeniería de Software",
                22, true, null, null, List.of());
    }

    private void createCourse(String code) {
        newJdbcTemplate().update(
                "INSERT INTO courses (id, code, name, credits, weekly_hours, required_room_type, cycle) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), code, "Curso " + code, 3, 3.0, "LABORATORY", 1
        );
    }

    @Test
    @DisplayName("create: persiste y devuelve el estudiante activo")
    void create_persists() {
        Student student = adapter.create(sampleData("E-001"));

        assertThat(student.id()).isNotNull();
        assertThat(student.code()).isEqualTo("E-001");
        assertThat(student.cycle()).isEqualTo(3);
        assertThat(student.creditLimit()).isEqualTo(22);
        assertThat(student.isActive()).isTrue();
    }

    @Test
    @DisplayName("create: código duplicado lanza DuplicateFieldException")
    void create_duplicateCode_throws() {
        adapter.create(sampleData("E-001"));

        assertThatThrownBy(() -> adapter.create(sampleData("E-001")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("create: sincroniza cursos aprobados")
    void create_syncsApprovedCourses() {
        createCourse("INF-101");
        StudentData data = new StudentData(null, "E-001", "Estudiante E-001", 3, "Ingeniería",
                22, true, null, null, List.of("INF-101"));

        Student created = adapter.create(data);

        assertThat(created.approvedCourses()).containsExactly("INF-101");
    }

    @Test
    @DisplayName("findById: existente devuelve el estudiante enriquecido")
    void findById_existing_returnsStudent() {
        Student created = adapter.create(sampleData("E-001"));

        Optional<Student> found = adapter.findById(created.id());

        assertThat(found).isPresent();
        assertThat(found.get().code()).isEqualTo("E-001");
    }

    @Test
    @DisplayName("findById: inexistente devuelve Optional vacío")
    void findById_missing_returnsEmpty() {
        assertThat(adapter.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("findByUserId: inexistente devuelve Optional vacío")
    void findByUserId_missing_returnsEmpty() {
        assertThat(adapter.findByUserId(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("update: actualiza campos y resincroniza cursos aprobados")
    void update_updatesFieldsAndCourses() {
        Student created = adapter.create(sampleData("E-001"));
        createCourse("INF-202");

        Student updated = adapter.update(created.id(), new StudentData(
                null, "E-002", "Estudiante Actualizado", 5, "Ciencia de Datos",
                24, true, null, null, List.of("INF-202")
        ));

        assertThat(updated.code()).isEqualTo("E-002");
        assertThat(updated.fullName()).isEqualTo("Estudiante Actualizado");
        assertThat(updated.cycle()).isEqualTo(5);
        assertThat(updated.creditLimit()).isEqualTo(24);
        assertThat(updated.approvedCourses()).containsExactly("INF-202");
    }

    @Test
    @DisplayName("findAll: devuelve todos los estudiantes creados")
    void findAll_returnsAll() {
        adapter.create(sampleData("E-001"));
        adapter.create(sampleData("E-002"));

        List<Student> all = adapter.findAll();

        assertThat(all).extracting(Student::code).containsExactlyInAnyOrder("E-001", "E-002");
    }

    @Test
    @DisplayName("searchByCodeOrName: filtra por coincidencia")
    void searchByCodeOrName_filters() {
        adapter.create(sampleData("E-001"));
        adapter.create(sampleData("E-002"));

        List<Student> results = adapter.searchByCodeOrName("E-001");

        assertThat(results).extracting(Student::code).containsExactly("E-001");
    }

    @Test
    @DisplayName("findAllPaged: devuelve página con total correcto")
    void findAllPaged_returnsPage() {
        adapter.create(sampleData("E-001"));
        adapter.create(sampleData("E-002"));
        adapter.create(sampleData("E-003"));

        Page<Student> page = adapter.findAllPaged(1, 2);

        assertThat(page.content()).hasSize(2);
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("searchPaged: filtra y pagina")
    void searchPaged_filtersAndPaginates() {
        adapter.create(sampleData("E-001"));
        adapter.create(sampleData("E-002"));
        adapter.create(new StudentData(null, "X-001", "Otro Estudiante", 1, "Arte", 22, true, null, null, List.of()));

        Page<Student> page = adapter.searchPaged("E-", 1, 10);

        assertThat(page.content()).extracting(Student::code).containsExactlyInAnyOrder("E-001", "E-002");
        assertThat(page.totalCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("deactivate: marca el estudiante como inactivo")
    void deactivate_setsActiveFalse() {
        Student created = adapter.create(sampleData("E-001"));

        adapter.deactivate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isFalse();
    }

    @Test
    @DisplayName("delete: elimina el estudiante sin horarios generados")
    void delete_removesStudent() {
        Student created = adapter.create(sampleData("E-001"));

        adapter.delete(created.id());

        assertThat(adapter.findById(created.id())).isEmpty();
    }
}
