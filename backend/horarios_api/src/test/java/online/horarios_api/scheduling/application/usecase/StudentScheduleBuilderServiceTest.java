package online.horarios_api.scheduling.application.usecase;

import online.horarios_api.scheduling.domain.model.StudentBuilderDraft;
import online.horarios_api.scheduling.domain.model.StudentScheduleConflict;
import online.horarios_api.scheduling.domain.port.out.StudentScheduleBuilderRepository;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentScheduleBuilderServiceTest {

    @Mock
    private StudentScheduleBuilderRepository repository;

    @InjectMocks
    private StudentScheduleBuilderService service;

    private final UUID studentId = UUID.randomUUID();
    private final UUID periodId = UUID.randomUUID();
    private final UUID scheduleId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final List<UUID> assignmentIds = List.of(UUID.randomUUID());

    @Test
    void ensureDraft_delegatesToRepository() {
        when(repository.ensureDraft(eq(studentId), eq(periodId), eq(actorId), anyInt(), anyInt()))
                .thenReturn(scheduleId);

        UUID result = service.ensureDraft(studentId, periodId, actorId);

        assertThat(result).isEqualTo(scheduleId);
    }

    @Test
    void addCourse_throwsConflictWhenValidationFails() {
        when(repository.validateAddCourse(studentId, scheduleId, courseId, assignmentIds))
                .thenReturn(List.of(new StudentScheduleConflict(
                        "OVERLAP", "Solapamiento detectado", courseId)));

        assertThatThrownBy(() -> service.addCourse(
                studentId, scheduleId, courseId, assignmentIds, actorId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Solapamiento");
    }

    @Test
    void addCourse_persistsWhenNoConflicts() {
        UUID itemId = UUID.randomUUID();
        when(repository.validateAddCourse(studentId, scheduleId, courseId, assignmentIds))
                .thenReturn(List.of());
        when(repository.addCourse(
                eq(studentId), eq(scheduleId), eq(courseId), eq(assignmentIds), eq(actorId), anyInt()))
                .thenReturn(itemId);

        UUID result = service.addCourse(studentId, scheduleId, courseId, assignmentIds, actorId);

        assertThat(result).isEqualTo(itemId);
        verify(repository).addCourse(
                eq(studentId), eq(scheduleId), eq(courseId), eq(assignmentIds), eq(actorId), anyInt());
    }

    @Test
    void getDraft_returnsOptionalFromRepository() {
        StudentBuilderDraft draft = new StudentBuilderDraft(
                scheduleId, 1, "DRAFT", "MANUAL", 22, 10,
                null, 90, 1, List.of());
        when(repository.findDraft(studentId, periodId)).thenReturn(Optional.of(draft));

        assertThat(service.getDraft(studentId, periodId)).contains(draft);
    }

    @Test
    void removeCourse_requiresIds() {
        assertThatThrownBy(() -> service.removeCourse(null, courseId))
                .isInstanceOf(BadRequestException.class);
    }
}
