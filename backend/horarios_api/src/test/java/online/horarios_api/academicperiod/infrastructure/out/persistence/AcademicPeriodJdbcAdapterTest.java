package online.horarios_api.academicperiod.infrastructure.out.persistence;

import online.horarios_api.academicperiod.domain.model.AcademicPeriod;
import online.horarios_api.academicperiod.domain.model.AcademicPeriodData;
import online.horarios_api.shared.domain.exception.ConflictException;
import online.horarios_api.shared.domain.exception.DuplicateFieldException;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("AcademicPeriodJdbcAdapter — persistencia real contra Postgres (Testcontainers)")
class AcademicPeriodJdbcAdapterTest extends PostgresPersistenceTestBase {

    private AcademicPeriodJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AcademicPeriodJdbcAdapter(newJdbcTemplate());
    }

    private AcademicPeriodData sampleData(String code) {
        return new AcademicPeriodData(
                code, "Periodo " + code,
                LocalDate.of(2026, Month.MARCH, 1), LocalDate.of(2026, Month.JULY, 15),
                "PLANNING", 22, true
        );
    }

    @Test
    @DisplayName("create: persiste y devuelve el período")
    void create_persists() {
        AcademicPeriod period = adapter.create(sampleData("2026-1"));

        assertThat(period.id()).isNotNull();
        assertThat(period.code()).isEqualTo("2026-1");
        assertThat(period.status()).isEqualTo("PLANNING");
        assertThat(period.maxStudentCredits()).isEqualTo(22);
        assertThat(period.isActive()).isTrue();
    }

    @Test
    @DisplayName("create: código duplicado lanza DuplicateFieldException")
    void create_duplicateCode_throws() {
        adapter.create(sampleData("2026-1"));

        assertThatThrownBy(() -> adapter.create(sampleData("2026-1")))
                .isInstanceOf(DuplicateFieldException.class);
    }

    @Test
    @DisplayName("findById: existente devuelve Optional con el período")
    void findById_existing_returnsPeriod() {
        AcademicPeriod created = adapter.create(sampleData("2026-1"));

        Optional<AcademicPeriod> found = adapter.findById(created.id());

        assertThat(found).isPresent();
        assertThat(found.get().code()).isEqualTo("2026-1");
    }

    @Test
    @DisplayName("findById: inexistente devuelve Optional vacío")
    void findById_missing_returnsEmpty() {
        assertThat(adapter.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("update: actualiza los campos del período")
    void update_updatesFields() {
        AcademicPeriod created = adapter.create(sampleData("2026-1"));

        AcademicPeriod updated = adapter.update(created.id(), new AcademicPeriodData(
                "2026-1B", "Periodo actualizado",
                LocalDate.of(2026, Month.MARCH, 10), LocalDate.of(2026, Month.JULY, 20),
                "ACTIVE", 24, false
        ));

        assertThat(updated.code()).isEqualTo("2026-1B");
        assertThat(updated.name()).isEqualTo("Periodo actualizado");
        assertThat(updated.status()).isEqualTo("ACTIVE");
        assertThat(updated.maxStudentCredits()).isEqualTo(24);
        assertThat(updated.isActive()).isFalse();
    }

    @Test
    @DisplayName("findAll: devuelve todos los períodos creados")
    void findAll_returnsAll() {
        adapter.create(sampleData("2026-1"));
        adapter.create(sampleData("2026-2"));

        List<AcademicPeriod> all = adapter.findAll();

        assertThat(all).extracting(AcademicPeriod::code).containsExactlyInAnyOrder("2026-1", "2026-2");
    }

    @Test
    @DisplayName("search: filtra por código o nombre")
    void search_filtersByQuery() {
        adapter.create(sampleData("2026-1"));
        adapter.create(sampleData("2026-2"));

        List<AcademicPeriod> results = adapter.search("2026-1");

        assertThat(results).extracting(AcademicPeriod::code).containsExactly("2026-1");
    }

    @Test
    @DisplayName("activate: marca el período como activo")
    void activate_setsActiveTrue() {
        AcademicPeriod created = adapter.create(new AcademicPeriodData(
                "2026-1", "Periodo", LocalDate.of(2026, Month.MARCH, 1), LocalDate.of(2026, Month.JULY, 15),
                "PLANNING", 22, false
        ));

        adapter.activate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isTrue();
    }

    @Test
    @DisplayName("deactivate: marca el período como inactivo")
    void deactivate_setsActiveFalse() {
        AcademicPeriod created = adapter.create(sampleData("2026-1"));

        adapter.deactivate(created.id());

        assertThat(adapter.findById(created.id()).orElseThrow().isActive()).isFalse();
    }

    @Test
    @DisplayName("delete: elimina el período sin referencias")
    void delete_removesPeriod() {
        AcademicPeriod created = adapter.create(sampleData("2026-1"));

        adapter.delete(created.id());

        assertThat(adapter.findById(created.id())).isEmpty();
    }

    @Test
    @DisplayName("delete: período con horarios docentes asociados lanza ConflictException")
    void delete_withTeachingSchedules_throwsConflict() {
        AcademicPeriod created = adapter.create(sampleData("2026-1"));
        newJdbcTemplate().update(
                "INSERT INTO teaching_schedules (academic_period_id) VALUES (?)",
                created.id()
        );

        assertThatThrownBy(() -> adapter.delete(created.id()))
                .isInstanceOf(ConflictException.class);
    }
}
