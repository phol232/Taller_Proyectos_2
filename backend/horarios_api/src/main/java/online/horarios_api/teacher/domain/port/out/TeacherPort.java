package online.horarios_api.teacher.domain.port.out;

import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherPort {
    Teacher create(TeacherData command);
    Teacher update(UUID teacherId, TeacherData command);
    Optional<Teacher> findById(UUID teacherId);
    List<Teacher> findAll();
    List<Teacher> searchByCodeOrName(String query);
    void deactivate(UUID teacherId);
    void delete(UUID teacherId);
}
