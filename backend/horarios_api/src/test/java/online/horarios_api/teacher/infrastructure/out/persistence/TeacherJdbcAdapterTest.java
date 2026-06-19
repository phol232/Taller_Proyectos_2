package online.horarios_api.teacher.infrastructure.out.persistence;

import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.domain.model.ScheduleDay;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TeacherJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class TeacherJdbcAdapterTest extends PostgresPersistenceTestBase {

    private TeacherJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new TeacherJdbcAdapter(newJdbcTemplate());
    }

    private TeacherData sampleData(String code) {
        return new TeacherData(null, code, "Docente " + code, "Matemáticas", true, List.of(), List.of(), List.of());
    }

    private UUID createCourse(String code) {
        UUID id = UUID.randomUUID();
        newJdbcTemplate().update(
                "INSERT INTO courses (id, code, name, credits, weekly_hours, required_room_type, cycle) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, code, "Curso " + code, 3, 3.0, "LABORATORY", 1
        );
        return id;
    }

    @Test
    @DisplayName("create: persiste y devuelve el docente activo")
    void create_persists() {
        Teacher teacher = adapter.create(sampleData("D-001"));

        assertThat(teacher.id()).isNotNull();
        assertThat(teacher.code()).isEqualTo("D-001");
        assertThat(teacher.fullName()).isEqualTo("Docente D-001");
        assertThat(teacher.isActive()).isTrue();
    }

    @Test
    @DisplayName("create: código duplicado lanza DuplicateFieldException")
    void create_duplicateCode_throws() {
        adapter.create(sampleData("D-001"));

        assertThatThrownBy(() -> adapter.create(sampleData("D-001")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("create: sincroniza disponibilidad semanal")
    void create_syncsAvailability() {
        List<AvailabilitySlot> availability = List.of(
                new AvailabilitySlot(ScheduleDay.WEDNESDAY, LocalTime.of(14, 0), LocalTime.of(16, 0), true)
        );
        TeacherData data = new TeacherData(null, "D-001", "Docente D-001", "Física", true,
                availability, List.of(), List.of());

        Teacher created = adapter.create(data);

        assertThat(created.availability()).hasSize(1);
        assertThat(created.availability().getFirst().day()).isEqualTo(ScheduleDay.WEDNESDAY);
    }

    @Test
    @DisplayName("create: sincroniza cursos por código")
    void create_syncsCourseCodes() {
        createCourse("INF-101");
        TeacherData data = new TeacherData(null, "D-001", "Docente D-001", "Informática", true,
                List.of(), List.of("INF-101"), List.of());

        Teacher created = adapter.create(data);

        assertThat(created.courseCodes()).containsExactly("INF-101");
    }

    @Test
    @DisplayName("findById: existente devuelve el docente enriquecido")
    void findById_existing_returnsTeacher() {
        Teacher created = adapter.create(sampleData("D-001"));

        Optional<Teacher> found = adapter.findById(created.id());

        assertThat(found).isPresent();
        assertThat(found.get().code()).isEqualTo("D-001");
    }

    @Test
    @DisplayName("findById: inexistente devuelve Optional vacío")
    void findById_missing_returnsEmpty() {
        assertThat(adapter.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("update: actualiza campos y resincroniza disponibilidad")
    void update_updatesFieldsAndAvailability() {
        Teacher created = adapter.create(sampleData("D-001"));
        List<AvailabilitySlot> newAvailability = List.of(
                new AvailabilitySlot(ScheduleDay.FRIDAY, LocalTime.of(10, 0), LocalTime.of(12, 0), true)
        );
        TeacherData update = new TeacherData(null, "D-002", "Docente Actualizado", "Química", true,
                newAvailability, List.of(), List.of());

        Teacher updated = adapter.update(created.id(), update);

        assertThat(updated.code()).isEqualTo("D-002");
        assertThat(updated.fullName()).isEqualTo("Docente Actualizado");
        assertThat(updated.specialty()).isEqualTo("Química");
        assertThat(updated.availability()).hasSize(1);
        assertThat(updated.availability().getFirst().day()).isEqualTo(ScheduleDay.FRIDAY);
    }

    @Test
    @DisplayName("findAll: devuelve todos los docentes creados")
    void findAll_returnsAll() {
        adapter.create(sampleData("D-001"));
        adapter.create(sampleData("D-002"));

        List<Teacher> all = adapter.findAll();

        assertThat(all).extracting(Teacher::code).containsExactlyInAnyOrder("D-001", "D-002");
    }

    @Test
    @DisplayName("searchByCodeOrName: filtra por coincidencia")
    void searchByCodeOrName_filters() {
        adapter.create(sampleData("D-001"));
        adapter.create(sampleData("D-002"));

        List<Teacher> results = adapter.searchByCodeOrName("D-001");

        assertThat(results).extracting(Teacher::code).containsExactly("D-001");
    }

    @Test
    @DisplayName("findAllPaged: devuelve página con total correcto")
    void findAllPaged_returnsPage() {
        adapter.create(sampleData("D-001"));
        adapter.create(sampleData("D-002"));
        adapter.create(sampleData("D-003"));

        Page<Teacher> page = adapter.findAllPaged(1, 2);

        assertThat(page.content()).hasSize(2);
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("searchPaged: filtra y pagina")
    void searchPaged_filtersAndPaginates() {
        adapter.create(sampleData("D-001"));
        adapter.create(sampleData("D-002"));
        adapter.create(new TeacherData(null, "X-001", "Otro Docente", "Arte", true, List.of(), List.of(), List.of()));

        Page<Teacher> page = adapter.searchPaged("D-", 1, 10);

        assertThat(page.content()).extracting(Teacher::code).containsExactlyInAnyOrder("D-001", "D-002");
        assertThat(page.totalCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("deactivate: marca el docente como inactivo")
    void deactivate_setsActiveFalse() {
        Teacher created = adapter.create(sampleData("D-001"));

        adapter.deactivate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isFalse();
    }

    @Test
    @DisplayName("delete: elimina el docente sin asignaciones")
    void delete_removesTeacher() {
        Teacher created = adapter.create(sampleData("D-001"));

        adapter.delete(created.id());

        assertThat(adapter.findById(created.id())).isEmpty();
    }
}
