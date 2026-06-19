package online.horarios_api.course.infrastructure.out.persistence;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseComponentData;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CourseJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class CourseJdbcAdapterTest extends PostgresPersistenceTestBase {

    private CourseJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new CourseJdbcAdapter(newJdbcTemplate());
    }

    private List<CourseComponentData> generalComponent() {
        return List.of(new CourseComponentData("GENERAL", new BigDecimal("3.0"), "LABORATORY", 1, true));
    }

    private CourseData sampleData(String code) {
        return new CourseData(code, "Curso " + code, 1, 3, 0, new BigDecimal("3.0"),
                "LABORATORY", true, generalComponent(), List.of());
    }

    @Test
    @DisplayName("create: persiste y devuelve el curso con su componente")
    void create_persists() {
        Course course = adapter.create(sampleData("INF-101"));

        assertThat(course.id()).isNotNull();
        assertThat(course.code()).isEqualTo("INF-101");
        assertThat(course.credits()).isEqualTo(3);
        assertThat(course.components()).hasSize(1);
        assertThat(course.components().getFirst().componentType()).isEqualTo("GENERAL");
    }

    @Test
    @DisplayName("create: código duplicado lanza DuplicateFieldException")
    void create_duplicateCode_throws() {
        adapter.create(sampleData("INF-101"));

        assertThatThrownBy(() -> adapter.create(sampleData("INF-101")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("create: sin componentes lanza BadRequestException")
    void create_withoutComponents_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, new BigDecimal("3.0"),
                "LABORATORY", true, List.of(), List.of());

        assertThatThrownBy(() -> adapter.create(data))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("create: sincroniza prerrequisitos por código")
    void create_syncsPrerequisites() {
        adapter.create(sampleData("INF-100"));
        CourseData data = new CourseData("INF-101", "Curso INF-101", 2, 3, 0, new BigDecimal("3.0"),
                "LABORATORY", true, generalComponent(), List.of("INF-100"));

        Course created = adapter.create(data);

        assertThat(created.prerequisites()).containsExactly("INF-100");
    }

    @Test
    @DisplayName("findById: existente devuelve el curso enriquecido")
    void findById_existing_returnsCourse() {
        Course created = adapter.create(sampleData("INF-101"));

        Optional<Course> found = adapter.findById(created.id());

        assertThat(found).isPresent();
        assertThat(found.get().code()).isEqualTo("INF-101");
    }

    @Test
    @DisplayName("findById: inexistente devuelve Optional vacío")
    void findById_missing_returnsEmpty() {
        assertThat(adapter.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("update: actualiza campos y resincroniza componentes")
    void update_updatesFieldsAndComponents() {
        Course created = adapter.create(sampleData("INF-101"));
        List<CourseComponentData> newComponents = List.of(
                new CourseComponentData("THEORY", new BigDecimal("2.0"), "CLASSROOM", 1, true),
                new CourseComponentData("PRACTICE", new BigDecimal("2.0"), "LABORATORY", 2, true)
        );

        Course updated = adapter.update(created.id(), new CourseData(
                "INF-102", "Curso Actualizado", 2, 4, 0, new BigDecimal("4.0"),
                "CLASSROOM", true, newComponents, List.of()
        ));

        assertThat(updated.code()).isEqualTo("INF-102");
        assertThat(updated.name()).isEqualTo("Curso Actualizado");
        assertThat(updated.components()).extracting(c -> c.componentType())
                .containsExactlyInAnyOrder("THEORY", "PRACTICE");
    }

    @Test
    @DisplayName("findAll: devuelve todos los cursos creados")
    void findAll_returnsAll() {
        adapter.create(sampleData("INF-101"));
        adapter.create(sampleData("INF-102"));

        List<Course> all = adapter.findAll();

        assertThat(all).extracting(Course::code).containsExactlyInAnyOrder("INF-101", "INF-102");
    }

    @Test
    @DisplayName("searchByCodeOrName: filtra por coincidencia")
    void searchByCodeOrName_filters() {
        adapter.create(sampleData("INF-101"));
        adapter.create(sampleData("MAT-202"));

        List<Course> results = adapter.searchByCodeOrName("INF-101");

        assertThat(results).extracting(Course::code).containsExactly("INF-101");
    }

    @Test
    @DisplayName("findByCodes: devuelve solo los cursos solicitados")
    void findByCodes_returnsMatching() {
        adapter.create(sampleData("INF-101"));
        adapter.create(sampleData("INF-102"));
        adapter.create(sampleData("INF-103"));

        List<Course> results = adapter.findByCodes(List.of("INF-101", "INF-103"));

        assertThat(results).extracting(Course::code).containsExactlyInAnyOrder("INF-101", "INF-103");
    }

    @Test
    @DisplayName("findByCodes: lista vacía devuelve lista vacía sin tocar la BD")
    void findByCodes_emptyList_returnsEmpty() {
        assertThat(adapter.findByCodes(List.of())).isEmpty();
    }

    @Test
    @DisplayName("findAllPaged: devuelve página con total correcto")
    void findAllPaged_returnsPage() {
        adapter.create(sampleData("INF-101"));
        adapter.create(sampleData("INF-102"));
        adapter.create(sampleData("INF-103"));

        Page<Course> page = adapter.findAllPaged(1, 2);

        assertThat(page.content()).hasSize(2);
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("searchPaged: filtra y pagina")
    void searchPaged_filtersAndPaginates() {
        adapter.create(sampleData("INF-101"));
        adapter.create(sampleData("INF-102"));
        adapter.create(sampleData("MAT-201"));

        Page<Course> page = adapter.searchPaged("INF-", 1, 10);

        assertThat(page.content()).extracting(Course::code).containsExactlyInAnyOrder("INF-101", "INF-102");
        assertThat(page.totalCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("deactivate: marca el curso como inactivo")
    void deactivate_setsActiveFalse() {
        Course created = adapter.create(sampleData("INF-101"));

        adapter.deactivate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isFalse();
    }

    @Test
    @DisplayName("delete: elimina el curso sin asignaciones")
    void delete_removesCourse() {
        Course created = adapter.create(sampleData("INF-101"));

        adapter.delete(created.id());

        assertThat(adapter.findById(created.id())).isEmpty();
    }
}
