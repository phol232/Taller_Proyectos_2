package online.horarios_api.classroom.domain.port.out;

import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;
import online.horarios_api.shared.domain.model.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassroomPort {
    Classroom create(ClassroomData command);
    Classroom update(UUID classroomId, ClassroomData command);
    Optional<Classroom> findById(UUID classroomId);
    List<Classroom> findAll();
    List<Classroom> searchByCodeOrName(String query);
    Page<Classroom> findAllPaged(int page, int pageSize);
    Page<Classroom> searchPaged(String query, int page, int pageSize);
    void deactivate(UUID classroomId);
    void delete(UUID classroomId);
}
