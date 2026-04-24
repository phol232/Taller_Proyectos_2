package online.horarios_api.teacher.domain.port.in;

import online.horarios_api.shared.domain.model.Page;
import online.horarios_api.teacher.domain.model.Teacher;

import java.util.List;
import java.util.UUID;

public interface TeacherQueryUseCase {
    Teacher getTeacher(UUID teacherId);
    List<Teacher> listTeachers();
    List<Teacher> searchTeachers(String query);
    Page<Teacher> listTeachersPaged(int page, int pageSize);
    Page<Teacher> searchTeachersPaged(String query, int page, int pageSize);
}
