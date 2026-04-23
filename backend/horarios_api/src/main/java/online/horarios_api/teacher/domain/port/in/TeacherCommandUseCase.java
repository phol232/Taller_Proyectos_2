package online.horarios_api.teacher.domain.port.in;

import online.horarios_api.teacher.domain.model.Teacher;
import online.horarios_api.teacher.domain.model.TeacherData;

import java.util.UUID;

public interface TeacherCommandUseCase {
    Teacher createTeacher(TeacherData command);
    Teacher updateTeacher(UUID teacherId, TeacherData command);
    void deactivateTeacher(UUID teacherId);
    void deleteTeacher(UUID teacherId);
}
