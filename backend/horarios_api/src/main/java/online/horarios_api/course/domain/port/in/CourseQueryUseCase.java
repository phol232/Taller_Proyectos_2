package online.horarios_api.course.domain.port.in;

import online.horarios_api.course.domain.model.Course;

import java.util.List;
import java.util.UUID;

public interface CourseQueryUseCase {
    Course getCourse(UUID courseId);
    List<Course> listCourses();
    List<Course> searchCourses(String query);
}
