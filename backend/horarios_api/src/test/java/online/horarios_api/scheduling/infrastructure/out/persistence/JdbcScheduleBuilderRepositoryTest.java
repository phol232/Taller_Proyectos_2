package online.horarios_api.scheduling.infrastructure.out.persistence;

import online.horarios_api.scheduling.domain.model.RemovedSlotResult;
import online.horarios_api.scheduling.domain.model.ScheduleAssignment;
import online.horarios_api.scheduling.domain.model.SlotConflict;
import online.horarios_api.scheduling.domain.model.SlotInput;
import online.horarios_api.scheduling.domain.model.TimeSlot;
import online.horarios_api.shared.persistence.PostgresPersistenceTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JdbcScheduleBuilderRepository — persistencia real contra Postgres (Testcontainers)")
class JdbcScheduleBuilderRepositoryTest extends PostgresPersistenceTestBase {

    private JdbcScheduleBuilderRepository repository;
    private SchedulingFixtures fixtures;

    @BeforeEach
    void setUp() {
        var jdbc = newJdbcTemplate();
        repository = new JdbcScheduleBuilderRepository(jdbc);
        fixtures = new SchedulingFixtures(jdbc);
    }

    @Test
    @DisplayName("listActiveTimeSlots: devuelve los slots activos dentro del rango horario")
    void listActiveTimeSlots_returnsSlotsInRange() {
        fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));

        List<TimeSlot> slots = repository.listActiveTimeSlots();

        assertThat(slots).hasSize(1);
        assertThat(slots.getFirst().startTime()).isEqualTo(LocalTime.of(8, 0));
    }

    @Test
    @DisplayName("teacherTeachesComponent: true cuando el docente tiene el componente asignado")
    void teacherTeachesComponent_assigned_returnsTrue() {
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        fixtures.teacherCourseComponent(teacher, component);

        assertThat(repository.teacherTeachesComponent(teacher, component)).isTrue();
    }

    @Test
    @DisplayName("teacherTeachesComponent: false cuando no hay asignación")
    void teacherTeachesComponent_notAssigned_returnsFalse() {
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");

        assertThat(repository.teacherTeachesComponent(teacher, component)).isFalse();
    }

    @Test
    @DisplayName("teacherTeachesComponent: null devuelve false sin tocar la BD")
    void teacherTeachesComponent_nullArgs_returnsFalse() {
        assertThat(repository.teacherTeachesComponent(null, null)).isFalse();
    }

    @Test
    @DisplayName("timeSlotIdsOutsideTeacherAvailability: marca fuera de rango si no hay disponibilidad declarada")
    void timeSlotIdsOutsideTeacherAvailability_noAvailability_returnsEmpty() {
        UUID teacher = fixtures.teacher("D-001");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));

        List<UUID> outside = repository.timeSlotIdsOutsideTeacherAvailability(teacher, List.of(timeSlot));

        assertThat(outside).isEmpty();
    }

    @Test
    @DisplayName("timeSlotIdsOutsideTeacherAvailability: detecta slot fuera de la disponibilidad declarada")
    void timeSlotIdsOutsideTeacherAvailability_outsideRange_returnsSlotId() {
        UUID teacher = fixtures.teacher("D-001");
        UUID availableSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID outsideSlot = fixtures.timeSlot(LocalTime.of(18, 0), LocalTime.of(19, 30));
        fixtures.teacherAvailability(teacher, availableSlot, true);

        List<UUID> outside = repository.timeSlotIdsOutsideTeacherAvailability(
                teacher, List.of(availableSlot, outsideSlot));

        assertThat(outside).containsExactly(outsideSlot);
    }

    @Test
    @DisplayName("addCourse + listAssignments: crea la asignación con sus franjas y aparece en el listado")
    void addCourse_andListAssignments() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        UUID classroom = fixtures.classroom("A-101");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));

        UUID assignmentId = repository.addCourse(schedule, component, teacher, null, List.of(
                new SlotInput(classroom, timeSlot, LocalTime.of(8, 0), LocalTime.of(9, 30))
        ));

        assertThat(assignmentId).isNotNull();
        List<ScheduleAssignment> assignments = repository.listAssignments(schedule);
        assertThat(assignments).hasSize(1);
        ScheduleAssignment assignment = assignments.getFirst();
        assertThat(assignment.courseCode()).isEqualTo("INF-101");
        assertThat(assignment.teacherCode()).isEqualTo("D-001");
        assertThat(assignment.slots()).hasSize(1);
        assertThat(assignment.slots().getFirst().classroomCode()).isEqualTo("A-101");
    }

    @Test
    @DisplayName("addSlot: agrega una franja a una asignación existente")
    void addSlot_addsToExistingAssignment() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        UUID classroom = fixtures.classroom("A-101");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID assignmentId = repository.addCourse(schedule, component, teacher, null, List.of());

        UUID slotId = repository.addSlot(assignmentId,
                new SlotInput(classroom, timeSlot, LocalTime.of(8, 0), LocalTime.of(9, 30)));

        assertThat(slotId).isNotNull();
        assertThat(repository.listAssignments(schedule).getFirst().slots()).hasSize(1);
    }

    @Test
    @DisplayName("removeSlot: elimina la franja y reporta si la asignación queda incompleta")
    void removeSlot_removesAndReportsIncomplete() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        UUID classroom = fixtures.classroom("A-101");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        UUID assignmentId = repository.addCourse(schedule, component, teacher, null, List.of());
        UUID slotId = repository.addSlot(assignmentId,
                new SlotInput(classroom, timeSlot, LocalTime.of(8, 0), LocalTime.of(9, 30)));

        RemovedSlotResult result = repository.removeSlot(slotId);

        assertThat(result.assignmentId()).isEqualTo(assignmentId);
        assertThat(result.assignmentLeftIncomplete()).isTrue();
        assertThat(repository.listAssignments(schedule).getFirst().slots()).isEmpty();
    }

    @Test
    @DisplayName("removeAssignment: elimina la asignación completa")
    void removeAssignment_removesAssignment() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        UUID assignmentId = repository.addCourse(schedule, component, teacher, null, List.of());

        repository.removeAssignment(assignmentId);

        assertThat(repository.listAssignments(schedule)).isEmpty();
    }

    @Test
    @DisplayName("validateSlot: detecta conflicto de docente ocupado en el mismo horario")
    void validateSlot_detectsTeacherBusyConflict() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID course = fixtures.course("INF-101");
        UUID component = fixtures.courseComponent(course, "GENERAL");
        UUID teacher = fixtures.teacher("D-001");
        UUID classroom = fixtures.classroom("A-101");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));
        repository.addCourse(schedule, component, teacher, null, List.of(
                new SlotInput(classroom, timeSlot, LocalTime.of(8, 0), LocalTime.of(9, 30))
        ));

        List<SlotConflict> conflicts = repository.validateSlot(
                schedule, null, teacher, classroom, timeSlot,
                LocalTime.of(8, 0), LocalTime.of(9, 30), null);

        assertThat(conflicts).extracting(SlotConflict::conflictType).contains("TEACHER_BUSY", "CLASSROOM_BUSY");
    }

    @Test
    @DisplayName("validateSlot: sin conflictos devuelve lista vacía")
    void validateSlot_noConflicts_returnsEmpty() {
        UUID schedule = fixtures.teachingSchedule(fixtures.academicPeriod());
        UUID teacher = fixtures.teacher("D-001");
        UUID classroom = fixtures.classroom("A-101");
        UUID timeSlot = fixtures.timeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30));

        List<SlotConflict> conflicts = repository.validateSlot(
                schedule, null, teacher, classroom, timeSlot,
                LocalTime.of(8, 0), LocalTime.of(9, 30), null);

        assertThat(conflicts).isEmpty();
    }
}
