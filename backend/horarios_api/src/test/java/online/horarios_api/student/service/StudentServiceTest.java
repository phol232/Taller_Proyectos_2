package online.horarios_api.student.service;

import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.student.application.usecase.StudentService;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;
import online.horarios_api.student.domain.port.out.StudentPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentService — lógica de negocio")
class StudentServiceTest {

    @Mock
    private StudentPort studentPort;

    @InjectMocks
    private StudentService service;

    @Test
    @DisplayName("createStudent: normaliza códigos de cursos aprobados")
    void createStudent_normalizesPayload() {
        when(studentPort.create(any())).thenAnswer(invocation -> {
            StudentData data = invocation.getArgument(0);
            return new Student(UUID.randomUUID(), data.userId(), data.code(), data.fullName(),
                    data.cycle(), data.career(), data.creditLimit(),
                    Boolean.TRUE.equals(data.isActive()), data.facultadId(), data.carreraId(), null,
                    data.approvedCourses(), Instant.now(), Instant.now());
        });

        service.createStudent(new StudentData(
                null,
                " est-01 ",
                " Estudiante Test ",
                5,
                " Ingeniería ",
                null,
                null,
                null,
                null,
                List.of(" inf-101 ", "INF-101", "mat-001")
        ));

        ArgumentCaptor<StudentData> captor = ArgumentCaptor.forClass(StudentData.class);
        verify(studentPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo("EST-01");
        assertThat(captor.getValue().approvedCourses()).containsExactly("INF-101", "MAT-001");
        assertThat(captor.getValue().creditLimit()).isEqualTo(22);
    }

    @Test
    @DisplayName("createStudent: ciclo inválido → BadRequestException")
    void createStudent_invalidCycle() {
        assertThatThrownBy(() -> service.createStudent(new StudentData(
                null, "EST-01", "Estudiante", 0, "Ingeniería", 22, true, null, null, List.of()
        ))).isInstanceOf(BadRequestException.class);
    }
}
