package online.horarios_api.classroom.infrastructure.out.persistence;

import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.shared.domain.model.ScheduleDay;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ClassroomJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class ClassroomJdbcAdapterTest extends PostgresPersistenceTestBase {

    private ClassroomJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ClassroomJdbcAdapter(newJdbcTemplate());
    }

    private ClassroomData sampleData(String code) {
        return new ClassroomData(code, "Aula " + code, 30, "LABORATORY", true, List.of(), List.of(), List.of());
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
    @DisplayName("create: persiste y devuelve el aula activa")
    void create_persists() {
        Classroom classroom = adapter.create(sampleData("A-101"));

        assertThat(classroom.id()).isNotNull();
        assertThat(classroom.code()).isEqualTo("A-101");
        assertThat(classroom.capacity()).isEqualTo(30);
        assertThat(classroom.type()).isEqualTo("LABORATORY");
        assertThat(classroom.isActive()).isTrue();
    }

    @Test
    @DisplayName("create: código duplicado lanza DuplicateFieldException")
    void create_duplicateCode_throws() {
        adapter.create(sampleData("A-101"));

        assertThatThrownBy(() -> adapter.create(sampleData("A-101")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("create: sincroniza disponibilidad semanal")
    void create_syncsAvailability() {
        List<AvailabilitySlot> availability = List.of(
                new AvailabilitySlot(ScheduleDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), true)
        );
        ClassroomData data = new ClassroomData("A-101", "Aula A-101", 30, "LABORATORY", true,
                availability, List.of(), List.of());

        Classroom created = adapter.create(data);

        assertThat(created.availability()).hasSize(1);
        assertThat(created.availability().getFirst().day()).isEqualTo(ScheduleDay.MONDAY);
    }

    @Test
    @DisplayName("create: sincroniza cursos asociados por código")
    void create_syncsCourseCodes() {
        createCourse("INF-101");
        ClassroomData data = new ClassroomData("A-101", "Aula A-101", 30, "LABORATORY", true,
                List.of(), List.of("INF-101"), List.of());

        Classroom created = adapter.create(data);

        assertThat(created.courseCodes()).containsExactly("INF-101");
    }

    @Test
    @DisplayName("findById: existente devuelve el aula enriquecida")
    void findById_existing_returnsClassroom() {
        Classroom created = adapter.create(sampleData("A-101"));

        Optional<Classroom> found = adapter.findById(created.id());

        assertThat(found).isPresent();
        assertThat(found.get().code()).isEqualTo("A-101");
    }

    @Test
    @DisplayName("findById: inexistente devuelve Optional vacío")
    void findById_missing_returnsEmpty() {
        assertThat(adapter.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("update: actualiza campos y resincroniza disponibilidad")
    void update_updatesFieldsAndAvailability() {
        Classroom created = adapter.create(sampleData("A-101"));
        List<AvailabilitySlot> newAvailability = List.of(
                new AvailabilitySlot(ScheduleDay.TUESDAY, LocalTime.of(9, 0), LocalTime.of(11, 0), true)
        );
        ClassroomData update = new ClassroomData("A-102", "Aula Actualizada", 40, "AUDITORIUM", true,
                newAvailability, List.of(), List.of());

        Classroom updated = adapter.update(created.id(), update);

        assertThat(updated.code()).isEqualTo("A-102");
        assertThat(updated.name()).isEqualTo("Aula Actualizada");
        assertThat(updated.capacity()).isEqualTo(40);
        assertThat(updated.availability()).hasSize(1);
        assertThat(updated.availability().getFirst().day()).isEqualTo(ScheduleDay.TUESDAY);
    }

    @Test
    @DisplayName("findAll: devuelve todas las aulas creadas")
    void findAll_returnsAll() {
        adapter.create(sampleData("A-101"));
        adapter.create(sampleData("A-102"));

        List<Classroom> all = adapter.findAll();

        assertThat(all).extracting(Classroom::code).containsExactlyInAnyOrder("A-101", "A-102");
    }

    @Test
    @DisplayName("searchByCodeOrName: filtra por coincidencia")
    void searchByCodeOrName_filters() {
        adapter.create(sampleData("A-101"));
        adapter.create(sampleData("B-202"));

        List<Classroom> results = adapter.searchByCodeOrName("A-101");

        assertThat(results).extracting(Classroom::code).containsExactly("A-101");
    }

    @Test
    @DisplayName("findAllPaged: devuelve página con total correcto")
    void findAllPaged_returnsPage() {
        adapter.create(sampleData("A-101"));
        adapter.create(sampleData("A-102"));
        adapter.create(sampleData("A-103"));

        Page<Classroom> page = adapter.findAllPaged(1, 2);

        assertThat(page.content()).hasSize(2);
        assertThat(page.totalCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("searchPaged: filtra y pagina")
    void searchPaged_filtersAndPaginates() {
        adapter.create(sampleData("A-101"));
        adapter.create(sampleData("A-102"));
        adapter.create(sampleData("B-202"));

        Page<Classroom> page = adapter.searchPaged("A-", 1, 10);

        assertThat(page.content()).extracting(Classroom::code).containsExactlyInAnyOrder("A-101", "A-102");
        assertThat(page.totalCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("deactivate: marca el aula como inactiva")
    void deactivate_setsActiveFalse() {
        Classroom created = adapter.create(sampleData("A-101"));

        adapter.deactivate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isFalse();
    }

    @Test
    @DisplayName("delete: elimina el aula sin asignaciones")
    void delete_removesClassroom() {
        Classroom created = adapter.create(sampleData("A-101"));

        adapter.delete(created.id());

        assertThat(adapter.findById(created.id())).isEmpty();
    }
}
