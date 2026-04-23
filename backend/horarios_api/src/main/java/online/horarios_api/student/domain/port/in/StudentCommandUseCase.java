package online.horarios_api.student.domain.port.in;

import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;

import java.util.UUID;

public interface StudentCommandUseCase {
    Student createStudent(StudentData command);
    Student updateStudent(UUID studentId, StudentData command);
    void deactivateStudent(UUID studentId);
    void deleteStudent(UUID studentId);
}
