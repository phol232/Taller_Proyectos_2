package online.horarios_api.classroom.domain.port.in;

import online.horarios_api.classroom.domain.model.Classroom;

import java.util.List;
import java.util.UUID;

public interface ClassroomQueryUseCase {
    Classroom getClassroom(UUID classroomId);
    List<Classroom> listClassrooms();
    List<Classroom> searchClassrooms(String query);
}
