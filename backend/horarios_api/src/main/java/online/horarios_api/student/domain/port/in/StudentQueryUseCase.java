package online.horarios_api.student.domain.port.in;

import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.student.domain.model.Student;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentQueryUseCase {
    Student getStudent(UUID studentId);
    Optional<Student> findStudentByUserId(UUID userId);
    List<Student> listStudents();
    List<Student> searchStudents(String query);
    Page<Student> listStudentsPaged(int page, int pageSize);
    Page<Student> searchStudentsPaged(String query, int page, int pageSize);
}
