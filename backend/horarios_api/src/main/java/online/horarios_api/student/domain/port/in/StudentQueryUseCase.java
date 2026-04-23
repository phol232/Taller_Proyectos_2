package online.horarios_api.student.domain.port.in;

import online.horarios_api.student.domain.model.Student;

import java.util.List;
import java.util.UUID;

public interface StudentQueryUseCase {
    Student getStudent(UUID studentId);
    List<Student> listStudents();
    List<Student> searchStudents(String query);
}
