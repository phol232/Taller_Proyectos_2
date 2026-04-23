package online.horarios_api.classroom.service;

import online.horarios_api.classroom.application.usecase.ClassroomService;
import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.classroom.domain.port.out.ClassroomPort;
import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.model.AvailabilitySlot;
import online.horarios_api.shared.domain.model.ScheduleDay;
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
@DisplayName("ClassroomService — lógica de negocio")
class ClassroomServiceTest {

    @Mock
    private ClassroomPort classroomPort;

    @InjectMocks
    private ClassroomService service;

    @Test
    @DisplayName("createClassroom: normaliza datos")
    void createClassroom_normalizesPayload() {
        when(classroomPort.create(any())).thenAnswer(invocation -> {
            ClassroomData data = invocation.getArgument(0);
            return new Classroom(UUID.randomUUID(), data.code(), data.name(), data.capacity(), data.type(),
                    data.isActive(), data.availability(), Instant.now(), Instant.now());
        });

        service.createClassroom(new ClassroomData(
                " a-101 ",
                " Aula 101 ",
                30,
                " laboratorio ",
                null,
                List.of(new AvailabilitySlot(ScheduleDay.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), true))
        ));

        ArgumentCaptor<ClassroomData> captor = ArgumentCaptor.forClass(ClassroomData.class);
        verify(classroomPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo("A-101");
        assertThat(captor.getValue().name()).isEqualTo("Aula 101");
        assertThat(captor.getValue().isActive()).isTrue();
    }

    @Test
    @DisplayName("createClassroom: capacidad inválida → BadRequestException")
    void createClassroom_invalidCapacity() {
        assertThatThrownBy(() -> service.createClassroom(new ClassroomData(
                "A-101", "Aula", 0, "Laboratorio", true, List.of()
        ))).isInstanceOf(BadRequestException.class);
    }
}
