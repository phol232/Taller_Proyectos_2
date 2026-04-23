package online.horarios_api.teacher.domain.port.in;

import online.horarios_api.teacher.domain.model.Teacher;

import java.util.List;
import java.util.UUID;

public interface TeacherQueryUseCase {
    Teacher getTeacher(UUID teacherId);
    List<Teacher> listTeachers();
    List<Teacher> searchTeachers(String query);
}
