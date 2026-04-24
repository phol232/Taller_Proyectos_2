package online.horarios_api.classroom.domain.port.in;

import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.shared.domain.model.Page;

import java.util.List;
import java.util.UUID;

public interface ClassroomQueryUseCase {
    Classroom getClassroom(UUID classroomId);
    List<Classroom> listClassrooms();
    List<Classroom> searchClassrooms(String query);
    Page<Classroom> listClassroomsPaged(int page, int pageSize);
    Page<Classroom> searchClassroomsPaged(String query, int page, int pageSize);
}
