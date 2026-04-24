package online.horarios_api.course.domain.port.in;

import online.horarios_api.course.domain.model.Course;
import online.horarios_api.shared.domain.model.Page;

import java.util.List;
import java.util.UUID;

public interface CourseQueryUseCase {
    Course getCourse(UUID courseId);
    List<Course> listCourses();
    List<Course> searchCourses(String query);
    List<Course> findCoursesByCodes(List<String> codes);
    Page<Course> listCoursesPaged(int page, int pageSize);
    Page<Course> searchCoursesPaged(String query, int page, int pageSize);
}
