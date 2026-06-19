package online.horarios_api.course.application.usecase;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.course.domain.model.CourseComponentData;
import online.horarios_api.course.domain.model.CourseData;
import online.horarios_api.course.domain.port.out.CoursePort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseService — cobertura adicional de consultas y validaciones")
class CourseServiceMoreTest {

    private static final Instant FIXED_INSTANT = Instant.parse("2026-01-01T00:00:00Z");

    @Mock
    private CoursePort coursePort;

    private CourseService service;

    @BeforeEach
    void setUp() {
        service = new CourseService(coursePort);
    }

    private Course sampleCourse(UUID id) {
        return new Course(id, "INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LABORATORY", true,
                List.of(), List.of(), FIXED_INSTANT, FIXED_INSTANT);
    }

    private CourseData minimalValidData() {
        return new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.valueOf(3.0), "LABORATORY",
                true, null, List.of());
    }

    @Test
    @DisplayName("updateCourse: curso inexistente lanza NotFoundException")
    void updateCourse_missing_throws() {
        UUID id = UUID.randomUUID();
        when(coursePort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateCourse(id, minimalValidData()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateCourse: existente delega en el puerto")
    void updateCourse_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(coursePort.findById(id)).thenReturn(Optional.of(sampleCourse(id)));
        when(coursePort.update(any(), any())).thenReturn(sampleCourse(id));

        service.updateCourse(id, minimalValidData());

        verify(coursePort).update(any(), any());
    }

    @Test
    @DisplayName("deactivateCourse: inexistente lanza NotFoundException")
    void deactivateCourse_missing_throws() {
        UUID id = UUID.randomUUID();
        when(coursePort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deactivateCourse(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deactivateCourse: existente delega en el puerto")
    void deactivateCourse_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(coursePort.findById(id)).thenReturn(Optional.of(sampleCourse(id)));

        service.deactivateCourse(id);

        verify(coursePort).deactivate(id);
    }

    @Test
    @DisplayName("deleteCourse: existente delega en el puerto")
    void deleteCourse_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(coursePort.findById(id)).thenReturn(Optional.of(sampleCourse(id)));

        service.deleteCourse(id);

        verify(coursePort).delete(id);
    }

    @Test
    @DisplayName("listCourses: delega en el puerto")
    void listCourses_delegatesToPort() {
        service.listCourses();

        verify(coursePort).findAll();
    }

    @Test
    @DisplayName("searchCourses: query vacía cae a findAll")
    void searchCourses_blankQuery_fallsBackToFindAll() {
        service.searchCourses(" ");

        verify(coursePort).findAll();
    }

    @Test
    @DisplayName("searchCourses: con query delega en búsqueda")
    void searchCourses_withQuery_delegatesToSearch() {
        service.searchCourses(" inf ");

        verify(coursePort).searchByCodeOrName("inf");
    }

    @Test
    @DisplayName("findCoursesByCodes: lista nula devuelve vacío sin tocar el puerto")
    void findCoursesByCodes_nullList_returnsEmpty() {
        assertThat(service.findCoursesByCodes(null)).isEmpty();
        verify(coursePort, never()).findByCodes(any());
    }

    @Test
    @DisplayName("findCoursesByCodes: filtra blancos, normaliza y deduplica")
    void findCoursesByCodes_normalizesAndDeduplicates() {
        service.findCoursesByCodes(java.util.Arrays.asList(" inf-101 ", "INF-101", "", null, "mat-001"));

        verify(coursePort).findByCodes(List.of("INF-101", "MAT-001"));
    }

    @Test
    @DisplayName("findCoursesByCodes: todos los códigos en blanco devuelve vacío sin tocar el puerto")
    void findCoursesByCodes_allBlank_returnsEmpty() {
        assertThat(service.findCoursesByCodes(List.of("  ", ""))).isEmpty();
        verify(coursePort, never()).findByCodes(any());
    }

    @Test
    @DisplayName("listCoursesPaged: delega en el puerto")
    void listCoursesPaged_delegatesToPort() {
        service.listCoursesPaged(1, 10);

        verify(coursePort).findAllPaged(1, 10);
    }

    @Test
    @DisplayName("searchCoursesPaged: query vacía cae a findAllPaged")
    void searchCoursesPaged_blankQuery_fallsBackToFindAllPaged() {
        service.searchCoursesPaged(null, 1, 10);

        verify(coursePort).findAllPaged(1, 10);
    }

    @Test
    @DisplayName("searchCoursesPaged: con query delega en searchPaged")
    void searchCoursesPaged_withQuery_delegatesToSearchPaged() {
        service.searchCoursesPaged(" inf ", 1, 10);

        verify(coursePort).searchPaged("inf", 1, 10);
    }

    @Test
    @DisplayName("createCourse: sin componentes genera un componente GENERAL por defecto")
    void createCourse_withoutComponents_defaultsToGeneral() {
        ArgumentCaptor<CourseData> captor = ArgumentCaptor.forClass(CourseData.class);
        when(coursePort.create(any())).thenReturn(sampleCourse(UUID.randomUUID()));

        service.createCourse(minimalValidData());

        verify(coursePort).create(captor.capture());
        assertThat(captor.getValue().components()).hasSize(1);
        assertThat(captor.getValue().components().getFirst().componentType()).isEqualTo("GENERAL");
    }

    @Test
    @DisplayName("createCourse: código vacío lanza BadRequestException")
    void createCourse_blankCode_throws() {
        CourseData data = new CourseData("  ", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: créditos fuera de rango lanza BadRequestException")
    void createCourse_invalidCredits_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 7, 0, BigDecimal.ONE, "LAB", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: ciclo fuera de rango lanza BadRequestException")
    void createCourse_invalidCycle_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 11, 3, 0, BigDecimal.ONE, "LAB", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: créditos requeridos negativos lanza BadRequestException")
    void createCourse_negativeRequiredCredits_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, -1, BigDecimal.ONE, "LAB", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: horas semanales nulas o no positivas lanza BadRequestException")
    void createCourse_invalidWeeklyHours_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ZERO, "LAB", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: tipo de aula requerido vacío lanza BadRequestException")
    void createCourse_blankRoomType_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "  ", true, null, List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: mezclar GENERAL con THEORY/PRACTICE lanza BadRequestException")
    void createCourse_mixingGeneralWithSpecific_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("GENERAL", BigDecimal.ONE, "LAB", 1, true),
                new CourseComponentData("THEORY", BigDecimal.ONE, "LAB", 2, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: más de un componente GENERAL lanza BadRequestException")
    void createCourse_multipleGeneral_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("GENERAL", BigDecimal.ONE, "LAB", 1, true),
                new CourseComponentData("GENERAL", BigDecimal.ONE, "LAB", 2, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: tipos de componente repetidos lanza BadRequestException")
    void createCourse_duplicateComponentTypes_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("THEORY", BigDecimal.ONE, "LAB", 1, true),
                new CourseComponentData("THEORY", BigDecimal.ONE, "LAB", 2, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: órdenes de componente repetidos lanza BadRequestException")
    void createCourse_duplicateSortOrders_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("THEORY", BigDecimal.ONE, "LAB", 1, true),
                new CourseComponentData("PRACTICE", BigDecimal.ONE, "LAB", 1, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: tipo de componente inválido lanza BadRequestException")
    void createCourse_invalidComponentType_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("OTHER", BigDecimal.ONE, "LAB", 1, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: horas de componente no positivas lanza BadRequestException")
    void createCourse_invalidComponentWeeklyHours_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("THEORY", BigDecimal.ZERO, "LAB", 1, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createCourse: componente sin tipo de aula usa el de respaldo del curso")
    void createCourse_componentWithoutRoomType_usesFallback() {
        ArgumentCaptor<CourseData> captor = ArgumentCaptor.forClass(CourseData.class);
        when(coursePort.create(any())).thenReturn(sampleCourse(UUID.randomUUID()));
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LABORATORY", true, List.of(
                new CourseComponentData("THEORY", BigDecimal.ONE, "  ", null, null)
        ), List.of());

        service.createCourse(data);

        verify(coursePort).create(captor.capture());
        CourseComponentData component = captor.getValue().components().getFirst();
        assertThat(component.requiredRoomType()).isEqualTo("LABORATORY");
        assertThat(component.sortOrder()).isEqualTo(1);
        assertThat(component.isActive()).isTrue();
    }

    @Test
    @DisplayName("createCourse: orden de componente menor a 1 lanza BadRequestException")
    void createCourse_invalidSortOrder_throws() {
        CourseData data = new CourseData("INF-101", "Curso", 1, 3, 0, BigDecimal.ONE, "LAB", true, List.of(
                new CourseComponentData("THEORY", BigDecimal.ONE, "LAB", 0, true)
        ), List.of());

        assertThatThrownBy(() -> service.createCourse(data)).isInstanceOf(BadRequestException.class);
    }
}
