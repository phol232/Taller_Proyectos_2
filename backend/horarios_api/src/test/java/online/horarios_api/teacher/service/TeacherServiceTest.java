package online.horarios_api.teacher.service;

import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;
import online.horarios_api.teacher.application.usecase.TeacherService;
import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;
import online.horarios_api.teacher.domain.port.out.TeacherPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TeacherService — lógica de negocio")
class TeacherServiceTest {

    @Mock
    private TeacherPort teacherPort;

    @InjectMocks
    private TeacherService service;

    @Test
    @DisplayName("createTeacher: normaliza datos y elimina disponibilidad duplicada")
    void createTeacher_normalizesPayload() {
        UUID teacherId = UUID.randomUUID();
        when(teacherPort.create(any())).thenAnswer(invocation -> {
            TeacherData data = invocation.getArgument(0);
            return new Teacher(teacherId, data.userId(), data.code(), data.fullName(),
                    null, data.specialty(), data.isActive(), data.availability(), data.courseCodes(), Instant.now(), Instant.now());
        });

        service.createTeacher(new TeacherData(
                null,
                " doc-01 ",
                " Ada Lovelace ",
                " Matemática ",
                null,
                List.of(
                        new AvailabilitySlot(ScheduleDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), true),
                        new AvailabilitySlot(ScheduleDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), true)
                ),
                List.of("inf-101", "INF-101", " mat-001 ")
        ));

        ArgumentCaptor<TeacherData> captor = ArgumentCaptor.forClass(TeacherData.class);
        verify(teacherPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo("DOC-01");
        assertThat(captor.getValue().fullName()).isEqualTo("Ada Lovelace");
        assertThat(captor.getValue().availability()).hasSize(1);
        assertThat(captor.getValue().courseCodes()).containsExactly("INF-101", "MAT-001");
        assertThat(captor.getValue().isActive()).isTrue();
    }

    @Test
    @DisplayName("createTeacher: franja inválida → BadRequestException")
    void createTeacher_invalidAvailability_throws() {
        assertThatThrownBy(() -> service.createTeacher(new TeacherData(
                null,
                "DOC-01",
                "Docente",
                "Especialidad",
                true,
                List.of(new AvailabilitySlot(
                        ScheduleDay.MONDAY,
                        LocalTime.of(10, 0),
                        LocalTime.of(8, 0),
                        true
                )),
                List.of()
        ))).isInstanceOf(BadRequestException.class);
    }
}
