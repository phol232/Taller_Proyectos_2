package online.horarios_api.student.application.usecase;

import online.horarios_api.shared.domain.exception.BadRequestException;
import online.horarios_api.shared.domain.exception.NotFoundException;
import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;
import online.horarios_api.student.domain.port.out.StudentPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentService — lógica de aplicación con StudentPort mockeado")
class StudentServiceTest {

    @Mock
    private StudentPort studentPort;

    private StudentService service;

    @BeforeEach
    void setUp() {
        service = new StudentService(studentPort);
    }

    private Student sampleStudent(UUID id) {
        return new Student(id, null, "E-001", "Estudiante", 1, "Ing", 22, true, null, null, null, List.of(), null, null);
    }

    private StudentData sampleData() {
        return new StudentData(null, "e-001", "Estudiante Uno", 1, " Ingeniería ", null, null, null, null,
                List.of(" inf-101 ", "INF-101", ""));
    }

    @Test
    @DisplayName("createStudent: normaliza código a mayúsculas y dedupe de cursos aprobados")
    void createStudent_normalizesAndDelegates() {
        ArgumentCaptor<StudentData> captor = ArgumentCaptor.forClass(StudentData.class);
        when(studentPort.create(any())).thenReturn(sampleStudent(UUID.randomUUID()));

        service.createStudent(sampleData());

        verify(studentPort).create(captor.capture());
        StudentData normalized = captor.getValue();
        assertThat(normalized.code()).isEqualTo("E-001");
        assertThat(normalized.creditLimit()).isEqualTo(22);
        assertThat(normalized.isActive()).isTrue();
        assertThat(normalized.approvedCourses()).containsExactly("INF-101");
    }

    @Test
    @DisplayName("createStudent: ciclo <= 0 lanza BadRequestException")
    void createStudent_invalidCycle_throws() {
        StudentData invalid = new StudentData(null, "E-001", "Estudiante", 0, null, null, null, null, null, List.of());

        assertThatThrownBy(() -> service.createStudent(invalid)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createStudent: límite de créditos <= 0 lanza BadRequestException")
    void createStudent_invalidCreditLimit_throws() {
        StudentData invalid = new StudentData(null, "E-001", "Estudiante", 1, null, 0, null, null, null, List.of());

        assertThatThrownBy(() -> service.createStudent(invalid)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("createStudent: código vacío lanza BadRequestException")
    void createStudent_blankCode_throws() {
        StudentData invalid = new StudentData(null, "  ", "Estudiante", 1, null, null, null, null, null, List.of());

        assertThatThrownBy(() -> service.createStudent(invalid)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("updateStudent: estudiante inexistente lanza NotFoundException")
    void updateStudent_missing_throws() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateStudent(id, sampleData())).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateStudent: existente delega en el puerto")
    void updateStudent_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.of(sampleStudent(id)));
        when(studentPort.update(any(), any())).thenReturn(sampleStudent(id));

        service.updateStudent(id, sampleData());

        verify(studentPort).update(eq(id), any());
    }

    @Test
    @DisplayName("deactivateStudent: inexistente lanza NotFoundException")
    void deactivateStudent_missing_throws() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deactivateStudent(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("deactivateStudent: existente delega en el puerto")
    void deactivateStudent_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.of(sampleStudent(id)));

        service.deactivateStudent(id);

        verify(studentPort).deactivate(id);
    }

    @Test
    @DisplayName("deleteStudent: existente delega en el puerto")
    void deleteStudent_existing_delegates() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.of(sampleStudent(id)));

        service.deleteStudent(id);

        verify(studentPort).delete(id);
    }

    @Test
    @DisplayName("getStudent: inexistente lanza NotFoundException")
    void getStudent_missing_throws() {
        UUID id = UUID.randomUUID();
        when(studentPort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getStudent(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("findStudentByUserId: userId nulo devuelve Optional vacío sin tocar el puerto")
    void findStudentByUserId_nullUserId_returnsEmpty() {
        assertThat(service.findStudentByUserId(null)).isEmpty();
        verify(studentPort, never()).findByUserId(any());
    }

    @Test
    @DisplayName("listStudents: delega en el puerto")
    void listStudents_delegatesToPort() {
        service.listStudents();

        verify(studentPort).findAll();
    }

    @Test
    @DisplayName("searchStudents: query vacía cae a findAll")
    void searchStudents_blankQuery_fallsBackToFindAll() {
        service.searchStudents("  ");

        verify(studentPort).findAll();
    }

    @Test
    @DisplayName("searchStudents: con query delega en búsqueda")
    void searchStudents_withQuery_delegatesToSearch() {
        service.searchStudents(" e-001 ");

        verify(studentPort).searchByCodeOrName("e-001");
    }

    @Test
    @DisplayName("listStudentsPaged: delega en el puerto")
    void listStudentsPaged_delegatesToPort() {
        service.listStudentsPaged(1, 10);

        verify(studentPort).findAllPaged(1, 10);
    }

    @Test
    @DisplayName("searchStudentsPaged: query vacía cae a findAllPaged")
    void searchStudentsPaged_blankQuery_fallsBackToFindAllPaged() {
        service.searchStudentsPaged("", 1, 10);

        verify(studentPort).findAllPaged(1, 10);
    }

    @Test
    @DisplayName("searchStudentsPaged: con query delega en searchPaged")
    void searchStudentsPaged_withQuery_delegatesToSearchPaged() {
        service.searchStudentsPaged(" e ", 1, 10);

        verify(studentPort).searchPaged("e", 1, 10);
    }

    @Test
    @DisplayName("provisionStudentIfAbsent: userId nulo no hace nada")
    void provisionStudentIfAbsent_nullUserId_doesNothing() {
        service.provisionStudentIfAbsent(null, "a@continental.edu.pe", "Ana");

        verify(studentPort, never()).create(any());
    }

    @Test
    @DisplayName("provisionStudentIfAbsent: ya existe no crea de nuevo")
    void provisionStudentIfAbsent_alreadyExists_doesNotCreate() {
        UUID userId = UUID.randomUUID();
        when(studentPort.findByUserId(userId)).thenReturn(Optional.of(sampleStudent(UUID.randomUUID())));

        service.provisionStudentIfAbsent(userId, "a@continental.edu.pe", "Ana");

        verify(studentPort, never()).create(any());
    }

    @Test
    @DisplayName("provisionStudentIfAbsent: nuevo usuario crea estudiante con código derivado del email")
    void provisionStudentIfAbsent_newUser_createsWithEmailDerivedCode() {
        UUID userId = UUID.randomUUID();
        when(studentPort.findByUserId(userId)).thenReturn(Optional.empty());
        ArgumentCaptor<StudentData> captor = ArgumentCaptor.forClass(StudentData.class);
        when(studentPort.create(any())).thenReturn(sampleStudent(userId));

        service.provisionStudentIfAbsent(userId, "ana.lopez@continental.edu.pe", "Ana López");

        verify(studentPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo("ANA.LOPEZ");
        assertThat(captor.getValue().fullName()).isEqualTo("Ana López");
    }

    @Test
    @DisplayName("provisionStudentIfAbsent: sin nombre usa el email como nombre completo")
    void provisionStudentIfAbsent_blankFullName_usesEmail() {
        UUID userId = UUID.randomUUID();
        when(studentPort.findByUserId(userId)).thenReturn(Optional.empty());
        ArgumentCaptor<StudentData> captor = ArgumentCaptor.forClass(StudentData.class);
        when(studentPort.create(any())).thenReturn(sampleStudent(userId));

        service.provisionStudentIfAbsent(userId, "ana@continental.edu.pe", "  ");

        verify(studentPort).create(captor.capture());
        assertThat(captor.getValue().fullName()).isEqualTo("ana@continental.edu.pe");
    }

    @Test
    @DisplayName("provisionStudentIfAbsent: sin email usa los primeros 8 caracteres del UUID como código")
    void provisionStudentIfAbsent_noEmail_usesUuidFallbackCode() {
        UUID userId = UUID.randomUUID();
        when(studentPort.findByUserId(userId)).thenReturn(Optional.empty());
        ArgumentCaptor<StudentData> captor = ArgumentCaptor.forClass(StudentData.class);
        when(studentPort.create(any())).thenReturn(sampleStudent(userId));

        service.provisionStudentIfAbsent(userId, null, null);

        verify(studentPort).create(captor.capture());
        assertThat(captor.getValue().code()).isEqualTo(userId.toString().substring(0, 8).toUpperCase());
        assertThat(captor.getValue().fullName()).isEqualTo("Estudiante");
    }
}
