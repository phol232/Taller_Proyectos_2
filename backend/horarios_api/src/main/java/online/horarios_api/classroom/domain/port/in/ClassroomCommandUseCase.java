package online.horarios_api.classroom.domain.port.in;

import online.horarios_api.classroom.domain.model.Classroom;
import online.horarios_api.classroom.domain.model.ClassroomData;

import java.util.UUID;

public interface ClassroomCommandUseCase {
    Classroom createClassroom(ClassroomData command);
    Classroom updateClassroom(UUID classroomId, ClassroomData command);
    void deactivateClassroom(UUID classroomId);
    void deleteClassroom(UUID classroomId);
}
