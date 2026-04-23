package online.horarios_api.student.domain.port.out;

import online.horarios_api.student.domain.model.Student;
import online.horarios_api.student.domain.model.StudentData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentPort {
    Student create(StudentData command);
    Student update(UUID studentId, StudentData command);
    Optional<Student> findById(UUID studentId);
    Optional<Student> findByUserId(UUID userId);
    List<Student> findAll();
    List<Student> searchByCodeOrName(String query);
    void deactivate(UUID studentId);
    void delete(UUID studentId);
}
